import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProfitShareRecordStatus,
  ProfitShareRuleStatus,
  ProfitShareRuleType,
  Prisma,
  Order,
} from '@prisma/client';

type RuleWithDetails = Prisma.ProfitShareRuleGetPayload<{
  include: {
    modules: {
      include: {
        allocations: true;
      };
    };
  };
}>;
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

    // 1. 找出该规则下已经有结算 (SETTLED) 或退回 (CLAWBACK) 流水的订单（这些订单被视为“已锁定”，不能再重算，也不能删除它们剩下的 PENDING 流水）
    const lockedRecords = await this.prisma.profitShareRecord.findMany({
      where: {
        ruleId: ruleId,
        status: {
          in: [
            ProfitShareRecordStatus.SETTLED,
            ProfitShareRecordStatus.CLAWBACK,
          ],
        },
      },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    const lockedOrderIds = lockedRecords
      .map((r) => r.orderId)
      .filter((id): id is string => Boolean(id));

    // 2. 删除该规则下所有尚未结算（PENDING）的流水，但必须排除掉那些“已锁定”的订单
    const deleted = await this.prisma.profitShareRecord.deleteMany({
      where: {
        ruleId: ruleId,
        status: ProfitShareRecordStatus.PENDING,
        ...(lockedOrderIds.length > 0 && {
          orderId: { notIn: lockedOrderIds },
        }),
      },
    });
    this.logger.log(
      `Deleted ${deleted.count} pending records for rule ${ruleId} before recalculation. Skipped locked orders: ${lockedOrderIds.length}`,
    );

    // 3. 查找符合条件且可以重算的订单（排除掉名下有 PENDING/SETTLED/CLAWBACK 的订单）
    const orders = await this.prisma.order.findMany({
      where: {
        financialClosedAt: {
          gte: rule.validStartTime,
          lte: rule.validEndTime,
        },
        ...(rule.productId && { productId: rule.productId }),
        ...(rule.channelId && { channelId: rule.channelId }),
        profitShareRecords: {
          none: {
            ruleId: ruleId,
            status: { not: ProfitShareRecordStatus.CANCELLED }, // 如果这个订单在这个规则下只有 CANCELLED 流水，是可以被重新计算的
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

    return {
      success: true,
      processedOrders: processedCount,
      totalFound: orders.length,
    };
  }

  /**
   * 处理退款回扣逻辑（按比例缩小）
   */
  async handleRefundClawback(orderId: string, refundAmount: number) {
    this.logger.log(
      `Handling refund clawback for order: ${orderId}, amount: ${refundAmount}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    const refundRatio = refundAmount / order.amount;

    // 查出该订单所有需要回扣的流水
    const records = await this.recordRepository.findRecordsForRefund(orderId);

    for (const record of records) {
      const deductionAmount = Math.round(record.profitAmount * refundRatio);

      if (record.status === ProfitShareRecordStatus.PENDING) {
        // 未结算，直接缩小原流水金额
        const newProfitAmount = record.profitAmount - deductionAmount;
        if (newProfitAmount <= 0) {
          await this.recordRepository.update({
            where: { id: record.id },
            data: {
              status: ProfitShareRecordStatus.CANCELLED,
              profitAmount: 0,
            },
          });
        } else {
          await this.recordRepository.update({
            where: { id: record.id },
            data: { profitAmount: newProfitAmount },
          });
        }
      } else if (record.status === ProfitShareRecordStatus.SETTLED) {
        // 已结算，生成一条负数的 CLAWBACK 流水
        await this.recordRepository.create({
          data: {
            orderId: record.orderId,
            ruleId: record.ruleId,
            moduleId: record.moduleId,
            memberId: record.memberId,
            ruleSnapshot: record.ruleSnapshot as Prisma.InputJsonValue, // 沿用原快照
            baseAmount: record.baseAmount,
            profitAmount: -deductionAmount,
            settlementTime: new Date(),
            status: ProfitShareRecordStatus.CLAWBACK,
          },
        });
      }
    }
  }

  /**
   * 生成单个订单的所有分润流水
   */
  private generateRecordsForOrder(
    order: Order,
    rule: RuleWithDetails,
  ): Prisma.ProfitShareRecordCreateManyInput[] {
    const recordsData: Prisma.ProfitShareRecordCreateManyInput[] = [];
    const baseAmount = order.amount;

    for (const module of rule.modules) {
      const isAmortized = module.amortizationType === 'MONTHLY';

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

        const totalProfitAmount = Math.round(
          baseAmount * shareRatioNum * allocation.ratio,
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
              baseAmount,
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
            // 服务结束后结算 (T+7)
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
            baseAmount,
            profitAmount: totalProfitAmount,
            settlementTime,
            status: ProfitShareRecordStatus.PENDING,
          });
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

    // 确定计算的月份范围（长期有效时最多计算至当前月份）
    const maxDate =
      end.getFullYear() >= 2090
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(end.getFullYear(), end.getMonth(), 1);

    const months: string[] = [];
    const curr = new Date(start.getFullYear(), start.getMonth(), 1);

    while (curr <= maxDate) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
      curr.setMonth(curr.getMonth() + 1);
    }

    if (months.length === 0) {
      const y = start.getFullYear();
      const m = String(start.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
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
