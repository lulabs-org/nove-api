import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProfitShareRecordStatus,
  ProfitShareRuleStatus,
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
   * 手动按规则批量补算历史订单分润
   */
  async calculateForSpecificRule(ruleId: string) {
    this.logger.log(`Start manual retroactive calculation for rule: ${ruleId}`);
    const rule = await this.ruleRepository.findByIdWithDetails(ruleId);
    if (!rule || rule.status !== ProfitShareRuleStatus.ACTIVE) {
      this.logger.warn(`Rule ${ruleId} is not active or not found.`);
      return { success: false, message: '规则不存在或未启用' };
    }

    // 查找符合条件且尚未分润（没有任何关联 ProfitShareRecord）的订单
    const orders = await this.prisma.order.findMany({
      where: {
        financialClosedAt: {
          gte: rule.validStartTime,
          lte: rule.validEndTime,
        },
        ...(rule.productId && { productId: rule.productId }),
        ...(rule.channelId && { channelId: rule.channelId }),
        profitShareRecords: {
          none: {},
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

      for (const allocation of module.allocations) {
        if (!allocation.memberId) continue;

        const shareRatioNum =
          'toNumber' in module.shareRatio &&
          typeof module.shareRatio.toNumber === 'function'
            ? module.shareRatio.toNumber()
            : Number(module.shareRatio);
        const allocRatioNum =
          'toNumber' in allocation.allocationRatio &&
          typeof allocation.allocationRatio.toNumber === 'function'
            ? allocation.allocationRatio.toNumber()
            : Number(allocation.allocationRatio);

        const totalProfitAmount = Math.round(
          baseAmount * shareRatioNum * allocRatioNum,
        );

        if (isAmortized && durationMonths > 1) {
          const monthlyProfit = Math.floor(totalProfitAmount / durationMonths);
          let remainingProfit = totalProfitAmount;

          for (let i = 0; i < durationMonths; i++) {
            const isLastMonth = i === durationMonths - 1;
            const currentProfit = isLastMonth ? remainingProfit : monthlyProfit;
            remainingProfit -= currentProfit;

            const settlementTime = new Date(benefitStartTime);
            settlementTime.setMonth(settlementTime.getMonth() + i);

            recordsData.push({
              orderId: order.id,
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

          recordsData.push({
            orderId: order.id,
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
}
