import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProfitShareRecordStatus,
  ProfitShareRuleStatus,
  ProfitShareRuleType,
  RefundStatus,
  Prisma,
  Order,
} from '@prisma/client';

import { RuleWithDetails } from '../types';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';

@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleRepository: ProfitSharingRuleRepository,
    private readonly recordRepository: ProfitSharingRecordRepository,
  ) {}

  /**
   * 订单核算完成时触发的分润计算逻辑
   */
  async calculateProfitShare(orderId: string) {
    this.logger.log(`Start calculating profit share for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refunds: {
          where: {
            status: RefundStatus.SETTLED,
            deletedAt: null,
          },
        },
      },
    });

    if (!order) {
      this.logger.error(`Order not found: ${orderId}`);
      return;
    }

    if (!order.financialClosedAt) {
      this.logger.warn(`Order ${orderId} is not financially closed yet.`);
      return;
    }

    // 匹配有效规则
    // 规则匹配逻辑：validStartTime <= financialClosedAt <= validEndTime 且匹配 productId/channelId
    const rules = await this.ruleRepository.findActiveRulesForOrder(
      order.financialClosedAt,
      order.productId,
      order.channelId,
    );

    // 如果有多条匹配，业务上可能需要做优先级排序（比如带 productId 的优先级高），这里取第一条
    const matchedRule = rules[0];
    if (!matchedRule) {
      this.logger.log(`No profit share rule matched for order: ${orderId}`);
      return;
    }

    const recordsData = this.generateRecordsForOrder(order, matchedRule);

    if (recordsData.length > 0) {
      await this.recordRepository.createMany({
        data: recordsData,
      });
      this.logger.log(
        `Successfully created ${recordsData.length} profit share records for order ${orderId}`,
      );
    }
  }

  /**
   * 手动按规则批量补算历史订单分润或月度固定分账
   */
  async calculateForSpecificRule(ruleId: string) {
    this.logger.log(`Start manual calculation for rule: ${ruleId}`);
    const rule = await this.ruleRepository.findByIdWithDetails(ruleId);
    if (!rule || rule.status !== ProfitShareRuleStatus.ACTIVE) {
      this.logger.warn(`Rule ${ruleId} is not active or not found.`);
      return { success: false, message: '规则不存在或未启用' };
    }

    if (rule.ruleType === ProfitShareRuleType.FIXED_MONTHLY) {
      return this.calculateFixedMonthlyRule(rule);
    }

    // 1. 找出该规则下已经由财务真正打款结算 (SETTLED) 的订单（这些订单被视为“已锁定”，不能直接删除原流水）
    const lockedRecords = await this.prisma.profitShareRecord.findMany({
      where: {
        ruleId: ruleId,
        status: ProfitShareRecordStatus.SETTLED,
      },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    const lockedOrderIds = lockedRecords
      .map((r) => r.orderId)
      .filter((id): id is string => Boolean(id));

    // 1.1 检查已锁定订单中是否存在已结算退款但尚未回扣的流水，自动触发补扣
    if (lockedOrderIds.length > 0) {
      const lockedOrdersWithRefunds = await this.prisma.order.findMany({
        where: {
          id: { in: lockedOrderIds },
          refunds: {
            some: {
              status: RefundStatus.SETTLED,
              deletedAt: null,
            },
          },
        },
        include: {
          refunds: {
            where: {
              status: RefundStatus.SETTLED,
              deletedAt: null,
            },
          },
          profitShareRecords: {
            where: {
              ruleId: ruleId,
              status: {
                in: [
                  ProfitShareRecordStatus.SETTLED,
                  ProfitShareRecordStatus.CLAWBACK,
                ],
              },
            },
          },
        },
      });

      for (const lockedOrder of lockedOrdersWithRefunds) {
        const totalSettledRefund = (lockedOrder.refunds || []).reduce(
          (sum, r) => sum + (r.refundAmount || 0),
          0,
        );
        const sortedRefunds = (lockedOrder.refunds || []).sort(
          (a, b) =>
            new Date(b.financialSettledAt || b.createdAt).getTime() -
            new Date(a.financialSettledAt || a.createdAt).getTime(),
        );
        const latestSettledAt =
          sortedRefunds[0]?.financialSettledAt ||
          sortedRefunds[0]?.createdAt ||
          new Date();

        if (totalSettledRefund > 0) {
          this.logger.log(
            `Checking locked order ${lockedOrder.id} with settled refund ${totalSettledRefund} for clawback`,
          );
          await this.handleRefundClawback(
            lockedOrder.id,
            totalSettledRefund,
            latestSettledAt,
          );
        }
      }
    }

    // 2. 删除该规则下所有尚未实际打款结算（非 SETTLED）的流水（包括 PENDING、CANCELLED、以及未锁定的旧 CLAWBACK），以便完整重新计算
    const deleted = await this.prisma.profitShareRecord.deleteMany({
      where: {
        ruleId: ruleId,
        status: {
          in: [
            ProfitShareRecordStatus.PENDING,
            ProfitShareRecordStatus.CANCELLED,
            ProfitShareRecordStatus.CLAWBACK,
          ],
        },
        ...(lockedOrderIds.length > 0 && {
          orderId: { notIn: lockedOrderIds },
        }),
      },
    });
    this.logger.log(
      `Deleted ${deleted.count} pending/cancelled/clawback records for rule ${ruleId} before recalculation. Skipped locked orders: ${lockedOrderIds.length}`,
    );

    // 3. 查找符合条件且可以重算的订单（排除掉名下有已结算 SETTLED 流水的订单）
    const orders = await this.prisma.order.findMany({
      where: {
        financialClosedAt: {
          gte: rule.validStartTime,
          lte: rule.validEndTime,
        },
        ...(rule.productId && { productId: rule.productId }),
        ...(rule.channelId && { channelId: rule.channelId }),
        ...(lockedOrderIds.length > 0 && {
          id: { notIn: lockedOrderIds },
        }),
      },
      include: {
        refunds: {
          where: {
            status: RefundStatus.SETTLED,
            deletedAt: null,
          },
        },
      },
    });

    this.logger.log(
      `Found ${orders.length} orders eligible for rule ${ruleId}`,
    );

    let processedCount = 0;
    for (const order of orders) {
      const recordsData = this.generateRecordsForOrder(order, rule);

      if (recordsData.length > 0) {
        await this.recordRepository.createMany({
          data: recordsData,
        });
        processedCount++;
      }
    }

    // 4. 自动触发全局退款回扣兜底对账，确保历史与跨期退款 100% 得到补偿与回扣
    let compensatedRefundOrders = 0;
    try {
      const reconcileRes = await this.reconcileRefundClawbacks();
      compensatedRefundOrders = reconcileRes.compensatedOrders;
      this.logger.log(
        `Auto refund reconciliation on rule ${ruleId} completed: scanned ${reconcileRes.scannedRefunds}, compensated ${compensatedRefundOrders} orders`,
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Auto refund reconciliation on rule ${ruleId} encountered non-critical error: ${errMsg}`,
      );
    }

    return {
      success: true,
      processedOrders: processedCount,
      totalFound: orders.length,
      compensatedRefundOrders,
    };
  }

  /**
   * 处理退款回扣逻辑（支持跨期账期归属与多笔退款增量补扣）
   */
  async handleRefundClawback(
    orderId: string,
    refundAmount: number,
    settledAt?: Date | string,
  ) {
    const settledStr =
      settledAt instanceof Date
        ? settledAt.toISOString()
        : settledAt
          ? String(settledAt)
          : 'now';
    this.logger.log(
      `Handling refund clawback for order: ${orderId}, amount: ${refundAmount}, settledAt: ${settledStr}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.amount <= 0) return;

    // 确定退款结算生效日期与当期账期（如 "2026-08"）
    const targetDate = settledAt ? new Date(settledAt) : new Date();
    const periodMonth = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1,
    ).padStart(2, '0')}`;

    const refundRatio = Math.min(1.0, refundAmount / order.amount);

    // 查出该订单所有需要回扣的流水（模块可退且为 PENDING 或 SETTLED）
    const records = await this.recordRepository.findRecordsForRefund(orderId);

    for (const record of records) {
      // 1. 查询该订单下该模块、该成员历史上已生成的 CLAWBACK 扣减总额（取正数累计）
      const existingClawbacks = await this.prisma.profitShareRecord.findMany({
        where: {
          orderId: record.orderId,
          ruleId: record.ruleId,
          moduleId: record.moduleId,
          memberId: record.memberId,
          status: ProfitShareRecordStatus.CLAWBACK,
        },
      });

      const alreadyClawedBack = existingClawbacks.reduce(
        (sum, c) => sum + Math.abs(c.profitAmount),
        0,
      );

      // 2. 计算基于累计退款比例应扣减的总额
      const targetTotalDeduction = Math.round(
        record.profitAmount * refundRatio,
      );

      // 3. 计算本次需要增量追加的回扣金额（Incremental Clawback）
      const incrementalDeduction = targetTotalDeduction - alreadyClawedBack;
      if (incrementalDeduction <= 0) {
        continue;
      }

      // 4. 无论原流水是 SETTLED（已结算）还是 PENDING（待结算），均生成一条归属退款当月的显式 CLAWBACK 负数流水
      // 这样既保留原提成事实，又让看板、流水列表及退款当期工资条拥有清晰可追溯的负数扣除明细
      await this.recordRepository.create({
        data: {
          orderId: record.orderId,
          periodMonth, // 核心：归入退款发生的当期月份，避免污染历史已封账月份
          ruleId: record.ruleId,
          moduleId: record.moduleId,
          memberId: record.memberId,
          ruleSnapshot: record.ruleSnapshot as Prisma.InputJsonValue,
          baseAmount: Math.round(order.amount * refundRatio),
          profitAmount: -incrementalDeduction,
          settlementTime: targetDate,
          status: ProfitShareRecordStatus.CLAWBACK,
        },
      });
    }
  }

  /**
   * 全局退款回扣对账与兜底补偿引擎
   * 自动扫描全库所有已结算的有效退款单，与分润流水核对，自动补齐遗漏的回扣流水
   */
  async reconcileRefundClawbacks() {
    this.logger.log('Starting global refund clawback reconciliation...');

    if (!this.prisma.orderRefund?.findMany) {
      return {
        success: true,
        scannedRefunds: 0,
        compensatedOrders: 0,
        totalCompensatedAmount: 0,
        details: [],
      };
    }

    // 1. 查找全库所有已结算、未被软删除且关联了有效订单的退款单
    const settledRefunds = await this.prisma.orderRefund.findMany({
      where: {
        status: RefundStatus.SETTLED,
        deletedAt: null,
        orderId: { not: null },
        refundAmount: { gt: 0 },
      },
      include: {
        order: true,
      },
    });

    let compensatedOrdersCount = 0;
    let totalCompensatedAmountCents = 0;
    const details: Array<{
      orderId: string;
      orderNumber: string;
      afterSaleCode: string;
      refundAmount: number;
      compensatedAmount: number;
    }> = [];

    for (const refund of settledRefunds) {
      if (!refund.orderId || !refund.refundAmount || !refund.order) continue;

      const orderId = refund.orderId;
      const order = refund.order;

      // 检查该订单名下是否已存在正向可退分润流水
      const existingCommissionRecords =
        await this.prisma.profitShareRecord.findMany({
          where: {
            orderId,
            module: { isRefundable: true },
            status: {
              in: [
                ProfitShareRecordStatus.PENDING,
                ProfitShareRecordStatus.SETTLED,
              ],
            },
          },
        });

      // 如果连正向提成流水都没有，先尝试自动计算该订单的初始分润
      if (existingCommissionRecords.length === 0) {
        this.logger.log(
          `Order ${orderId} (${order.orderNumber}) has settled refund but missing commission records. Calculating profit share first...`,
        );
        try {
          await this.calculateProfitShare(orderId);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to auto-calculate profit share for order ${orderId}: ${errMsg}`,
          );
        }
      }

      // 统计执行补扣前已存在的 CLAWBACK 金额
      const recordsBefore = await this.prisma.profitShareRecord.findMany({
        where: {
          orderId,
          status: ProfitShareRecordStatus.CLAWBACK,
        },
      });
      const beforeSum = recordsBefore.reduce(
        (sum, r) => sum + Math.abs(r.profitAmount),
        0,
      );

      // 执行增量补扣
      const settledDate =
        refund.financialSettledAt || refund.createdAt || new Date();
      await this.handleRefundClawback(
        orderId,
        refund.refundAmount,
        settledDate,
      );

      // 统计执行补扣后新增的 CLAWBACK 金额
      const recordsAfter = await this.prisma.profitShareRecord.findMany({
        where: {
          orderId,
          status: ProfitShareRecordStatus.CLAWBACK,
        },
      });
      const afterSum = recordsAfter.reduce(
        (sum, r) => sum + Math.abs(r.profitAmount),
        0,
      );

      const delta = afterSum - beforeSum;
      if (delta > 0) {
        compensatedOrdersCount++;
        totalCompensatedAmountCents += delta;
        details.push({
          orderId,
          orderNumber: order.orderNumber,
          afterSaleCode: refund.afterSaleCode,
          refundAmount: refund.refundAmount / 100,
          compensatedAmount: delta / 100,
        });
      }
    }

    this.logger.log(
      `Reconciliation finished: scanned ${settledRefunds.length} refunds, compensated ${compensatedOrdersCount} orders, total deducted ¥${totalCompensatedAmountCents / 100}`,
    );

    return {
      success: true,
      scannedRefunds: settledRefunds.length,
      compensatedOrders: compensatedOrdersCount,
      totalCompensatedAmount: totalCompensatedAmountCents / 100,
      details,
    };
  }

  /**
   * 生成单个订单的所有分润流水（支持扣除已结算退款）
   */
  private generateRecordsForOrder(
    order: Order & {
      refunds?: Array<{
        refundAmount?: number | null;
        status?: RefundStatus;
        deletedAt?: Date | null;
        financialSettledAt?: Date | null;
        createdAt?: Date | null;
      }>;
    },
    rule: RuleWithDetails,
  ): Prisma.ProfitShareRecordCreateManyInput[] {
    const recordsData: Prisma.ProfitShareRecordCreateManyInput[] = [];

    // 计算该订单所有已结算的有效退款金额总和
    const settledRefundAmount = (order.refunds || [])
      .filter((r) => r.status === RefundStatus.SETTLED && !r.deletedAt)
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    for (const module of rule.modules) {
      const isAmortized = module.amortizationType === 'MONTHLY';
      const isRefundable = module.isRefundable ?? true;

      let durationMonths = 1;
      let benefitStartTime = order.financialClosedAt || new Date();

      if (isAmortized && order.benefitStart && order.benefitEnd) {
        benefitStartTime = order.benefitStart;
        const dEnd = new Date(order.benefitEnd);
        const dStart = new Date(order.benefitStart);
        // 按实际相差月份计算 (例如: 1月1日 到 2月1日 = 1个月)
        const months =
          (dEnd.getFullYear() - dStart.getFullYear()) * 12 +
          (dEnd.getMonth() - dStart.getMonth());
        durationMonths = months > 0 ? months : 1;
      }

      // 根据模块分配模式动态确定收益人与分配比例
      let effectiveAllocations: Array<{ memberId: string; ratio: number }> = [];

      if (module.allocationMode === 'ORDER_OWNER') {
        const ownerId =
          order.currentOwnerId || module.allocations?.[0]?.memberId;
        if (ownerId) {
          effectiveAllocations = [{ memberId: ownerId, ratio: 1.0 }];
        } else {
          this.logger.warn(
            `Order ${order.id} has no currentOwnerId and module ${module.id} (${module.name}) has no fallback member. Skipping.`,
          );
          continue;
        }
      } else if (module.allocationMode === 'FINANCIAL_CLOSER') {
        const closerId =
          order.financialCloserId || module.allocations?.[0]?.memberId;
        if (closerId) {
          effectiveAllocations = [{ memberId: closerId, ratio: 1.0 }];
        } else {
          this.logger.warn(
            `Order ${order.id} has no financialCloserId and module ${module.id} (${module.name}) has no fallback member. Skipping.`,
          );
          continue;
        }
      } else {
        // 默认 FIXED 固定人员比例分配
        effectiveAllocations = (module.allocations || [])
          .filter((a) => Boolean(a.memberId))
          .map((a) => {
            const allocRatioNum =
              'toNumber' in a.allocationRatio &&
              typeof a.allocationRatio.toNumber === 'function'
                ? a.allocationRatio.toNumber()
                : Number(a.allocationRatio);
            return {
              memberId: a.memberId!,
              ratio: allocRatioNum,
            };
          });
      }

      for (const allocation of effectiveAllocations) {
        const shareRatioNum =
          'toNumber' in module.shareRatio &&
          typeof module.shareRatio.toNumber === 'function'
            ? module.shareRatio.toNumber()
            : Number(module.shareRatio);

        // 1. 正常生成订单全额提成流水 (PENDING)
        const totalProfitAmount = Math.round(
          order.amount * shareRatioNum * allocation.ratio,
        );

        if (isAmortized && durationMonths > 1) {
          const monthlyProfit = Math.floor(totalProfitAmount / durationMonths);
          let remainingProfit = totalProfitAmount;

          for (let i = 0; i < durationMonths; i++) {
            const isLastMonth = i === durationMonths - 1;
            const currentProfit = isLastMonth ? remainingProfit : monthlyProfit;
            remainingProfit -= currentProfit;

            const settlementTime = new Date(benefitStartTime);
            const pMonth = `${settlementTime.getFullYear()}-${String(
              settlementTime.getMonth() + 1,
            ).padStart(2, '0')}`;

            recordsData.push({
              orderId: order.id,
              periodMonth: pMonth,
              ruleId: rule.id,
              moduleId: module.id,
              memberId: allocation.memberId,
              ruleSnapshot: JSON.parse(
                JSON.stringify(rule),
              ) as Prisma.InputJsonValue,
              baseAmount: order.amount,
              profitAmount: currentProfit,
              settlementTime,
              status: ProfitShareRecordStatus.PENDING,
            });
          }
        } else {
          let settlementTime = new Date(
            benefitStartTime.getTime() + 7 * 24 * 60 * 60 * 1000,
          );
          if (module.amortizationType === 'END_OF_TERM' && order.benefitEnd) {
            settlementTime = new Date(
              order.benefitEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
            );
          }

          const bTime = new Date(benefitStartTime);
          const pMonth = `${bTime.getFullYear()}-${String(
            bTime.getMonth() + 1,
          ).padStart(2, '0')}`;

          recordsData.push({
            orderId: order.id,
            periodMonth: pMonth,
            ruleId: rule.id,
            moduleId: module.id,
            memberId: allocation.memberId,
            ruleSnapshot: JSON.parse(
              JSON.stringify(rule),
            ) as Prisma.InputJsonValue,
            baseAmount: order.amount,
            profitAmount: totalProfitAmount,
            settlementTime,
            status: ProfitShareRecordStatus.PENDING,
          });
        }

        // 2. 若存在已结算退款且该模块支持退款扣回，则生成显式负数已回扣流水 (CLAWBACK)
        if (isRefundable && settledRefundAmount > 0) {
          const clawbackProfitAmount = Math.round(
            settledRefundAmount * shareRatioNum * allocation.ratio,
          );

          if (clawbackProfitAmount > 0) {
            // 获取已结算退款的发生时间或当前时间，作为回扣归属账期
            const sortedSettledRefunds = (order.refunds || [])
              .filter((r) => r.status === RefundStatus.SETTLED && !r.deletedAt)
              .sort((a, b) => {
                const timeA = new Date(
                  a.financialSettledAt || a.createdAt || 0,
                ).getTime();
                const timeB = new Date(
                  b.financialSettledAt || b.createdAt || 0,
                ).getTime();
                return timeB - timeA;
              });
            const firstRefund = sortedSettledRefunds[0];
            const refundTime =
              firstRefund?.financialSettledAt ||
              firstRefund?.createdAt ||
              new Date();
            const rDate = new Date(refundTime);
            const refundPeriodMonth = `${rDate.getFullYear()}-${String(
              rDate.getMonth() + 1,
            ).padStart(2, '0')}`;

            recordsData.push({
              orderId: order.id,
              periodMonth: refundPeriodMonth,
              ruleId: rule.id,
              moduleId: module.id,
              memberId: allocation.memberId,
              ruleSnapshot: JSON.parse(
                JSON.stringify(rule),
              ) as Prisma.InputJsonValue,
              baseAmount: settledRefundAmount,
              profitAmount: -clawbackProfitAmount,
              settlementTime: rDate,
              status: ProfitShareRecordStatus.CLAWBACK,
            });
          }
        }
      }
    }

    return recordsData;
  }

  /**
   * 按月度固定规则批量生成分账流水
   */
  private async calculateFixedMonthlyRule(rule: RuleWithDetails) {
    this.logger.log(`Executing fixed monthly calculation for rule: ${rule.id}`);

    const start = new Date(rule.validStartTime);
    const end = new Date(rule.validEndTime);
    const now = new Date();

    // 统一以东八区（Asia/Shanghai / UTC+8）换算年月，防止 UTC 服务器因跨时区产生起始月偏移
    const getBeijingYearMonth = (d: Date) => {
      const bjDate = new Date(d.getTime() + 8 * 3600 * 1000);
      return {
        year: bjDate.getUTCFullYear(),
        month: bjDate.getUTCMonth() + 1,
      };
    };

    const startYM = getBeijingYearMonth(start);
    const endYM = getBeijingYearMonth(end);
    const nowYM = getBeijingYearMonth(now);

    const isPermanent = endYM.year >= 2090;
    const targetEndY = isPermanent ? nowYM.year : endYM.year;
    const targetEndM = isPermanent ? nowYM.month : endYM.month;

    const months: string[] = [];
    let curY = startYM.year;
    let curM = startYM.month;

    while (curY < targetEndY || (curY === targetEndY && curM <= targetEndM)) {
      months.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    if (months.length === 0) {
      months.push(`${startYM.year}-${String(startYM.month).padStart(2, '0')}`);
    }

    const recordsToCreate: Prisma.ProfitShareRecordCreateManyInput[] = [];

    for (const periodMonth of months) {
      const [yStr, mStr] = periodMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      for (const module of rule.modules) {
        for (const allocation of module.allocations) {
          if (!allocation.memberId) continue;
          const fixedAmount = allocation.fixedAmount ?? module.fixedAmount ?? 0;
          if (fixedAmount <= 0) continue;

          // 幂等检查：该规则 + 模块 + 成员在当前业务月度是否已存在非取消流水
          const existing = await this.prisma.profitShareRecord.findFirst({
            where: {
              ruleId: rule.id,
              moduleId: module.id,
              memberId: allocation.memberId,
              periodMonth,
              status: { not: ProfitShareRecordStatus.CANCELLED },
            },
          });

          if (!existing) {
            recordsToCreate.push({
              orderId: null,
              periodMonth,
              ruleId: rule.id,
              moduleId: module.id,
              memberId: allocation.memberId,
              ruleSnapshot: JSON.parse(
                JSON.stringify(rule),
              ) as Prisma.InputJsonValue,
              baseAmount: fixedAmount,
              profitAmount: fixedAmount,
              settlementTime: monthEnd,
              status: ProfitShareRecordStatus.PENDING,
            });
          }
        }
      }
    }

    if (recordsToCreate.length > 0) {
      await this.recordRepository.createMany({
        data: recordsToCreate,
      });
      this.logger.log(
        `Created ${recordsToCreate.length} fixed monthly records for rule ${rule.id} across ${months.length} months`,
      );
    }

    return {
      success: true,
      processedOrders: recordsToCreate.length,
      totalFound: months.length,
      isFixedMonthly: true,
    };
  }
}
