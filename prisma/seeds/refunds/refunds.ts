/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 12:44:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-14 20:15:49
 * @FilePath: /nove_api/prisma/seeds/refunds/refunds.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, OrderRefund } from '@prisma/client';
import { RefundConfig, RefundCreateInput } from './type';
import { REFUND_CONFIGS } from './config';

function convertToRefundCreateInput(config: RefundConfig): RefundCreateInput {
  return {
    afterSaleCode: config.afterSaleCode,
    submittedAt: config.submittedAt,
    refundedAt: config.refundedAt,
    refundChannel: config.refundChannel,
    approvalUrl: config.approvalUrl,
    refundAmount: config.refundAmount,
    refundReason: config.refundReason,
    benefitEndedAt: config.benefitEndedAt,
    benefitUsedDays: config.benefitUsedDays,
    applicantName: config.applicantName,
    isFinancialSettled: config.isFinancialSettled,
    financialSettledAt: config.financialSettledAt,
    financialNote: config.financialNote,
    parentId: null,
    productCategory: config.productCategory,
  };
}

export async function createRefunds(
  prisma: PrismaClient,
): Promise<OrderRefund[]> {
  console.log('💰 开始创建退款数据...');

  try {
    const refundPromises = REFUND_CONFIGS.map((config) => {
      const createInput = convertToRefundCreateInput(config);

      return prisma.orderRefund.create({
        data: createInput,
      });
    });

    const refunds = await Promise.all(refundPromises);

    refunds.forEach((refund) => {
      const status = refund.refundedAt ? '已退款' : '待处理';
      console.log(`✅ 创建退款记录: ${refund.afterSaleCode} (${status})`);
    });

    console.log(`💸 退款数据创建完成，共 ${refunds.length} 条记录`);
    return refunds;
  } catch (error) {
    console.error('❌ 创建退款数据失败:', error);
    throw error;
  }
}
