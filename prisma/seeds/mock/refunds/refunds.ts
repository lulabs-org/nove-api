import { PrismaClient, OrderRefund, Prisma } from '@prisma/client';
import { CreateRefundsParams, RefundConfig, RefundCreateInput } from './type';
import { REFUND_CONFIGS } from './config';

function convertToRefundCreateInput(
  config: RefundConfig,
  orderId: string,
  creatorId: string,
): RefundCreateInput {
  return {
    afterSaleCode: config.afterSaleCode,
    orderId,
    submittedAt: config.submittedAt,
    refundedAt: config.refundedAt,
    refundChannel: config.refundChannel,
    approvalUrl: config.approvalUrl,
    createdBy: creatorId,
    refundAmount: new Prisma.Decimal(config.refundAmount),
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
  params: CreateRefundsParams,
): Promise<OrderRefund[]> {
  console.log('💰 开始创建退款数据...');

  const { users, orders } = params;
  const { adminUser, financeUser } = users;

  try {
    const refundPromises = REFUND_CONFIGS.map((config) => {
      const orderId = orders[config.orderIndex].id;
      const creatorId =
        config.creatorType === 'admin' ? adminUser.id : financeUser.id;
      const createInput = convertToRefundCreateInput(
        config,
        orderId,
        creatorId,
      );

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
