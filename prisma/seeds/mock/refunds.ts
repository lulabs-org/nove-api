/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-16 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-16 10:00:00
 * @FilePath: /lulab_backend/prisma/seeds/refunds.ts
 * @Description: 退款数据种子模块 - 优化版本
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */
import { PrismaClient, Order, User, OrderRefund, Prisma } from '@prisma/client';

// ==================== 类型定义 ====================

/**
 * 创建退款所需的参数
 */
interface CreateRefundsParams {
  users: {
    adminUser: User;
    financeUser: User;
    normalUsers: User[];
  };
  orders: Order[];
}

/**
 * 退款配置数据类型
 */
interface RefundConfig {
  afterSaleCode: string;
  orderIndex: number; // orders 数组中的索引
  submittedAt: Date;
  refundedAt: Date | null;
  refundChannel: string;
  approvalUrl: string;
  creatorType: 'admin' | 'finance';
  refundAmount: number;
  refundReason: string;
  benefitEndedAt: Date | null;
  benefitUsedDays: number;
  applicantName: string;
  isFinancialSettled: boolean;
  financialSettledAt: Date | null;
  financialNote: string | null;
  productCategory: string;
}

// ==================== 退款配置数据 ====================

/**
 * 退款配置数据
 */
const REFUND_CONFIGS: RefundConfig[] = [
  // 第一个订单的部分退款
  {
    afterSaleCode: 'AS_20240125_001',
    orderIndex: 0,
    submittedAt: new Date('2024-01-25 10:00:00'),
    refundedAt: new Date('2024-01-26 15:30:00'),
    refundChannel: '抖音平台退款',
    approvalUrl: 'https://example.com/approval/AS_20240125_001',
    creatorType: 'admin',
    refundAmount: 100.0,
    refundReason: '学员因个人原因申请部分退款',
    benefitEndedAt: new Date('2024-01-25'),
    benefitUsedDays: 10,
    applicantName: '学员A',
    isFinancialSettled: true,
    financialSettledAt: new Date('2024-01-30'),
    financialNote: '已完成退款处理',
    productCategory: '课程',
  },
  // 咨询服务的全额退款
  {
    afterSaleCode: 'AS_20240305_002',
    orderIndex: 3,
    submittedAt: new Date('2024-03-05 14:20:00'),
    refundedAt: new Date('2024-03-06 09:15:00'),
    refundChannel: '抖音平台退款',
    approvalUrl: 'https://example.com/approval/AS_20240305_002',
    creatorType: 'finance',
    refundAmount: 199.0,
    refundReason: '服务质量不满意，申请全额退款',
    benefitEndedAt: new Date('2024-03-05'),
    benefitUsedDays: 4,
    applicantName: '学员D',
    isFinancialSettled: true,
    financialSettledAt: new Date('2024-03-08'),
    financialNote: '全额退款已处理',
    productCategory: '咨询',
  },
  // 会员的退款申请（未处理）
  {
    afterSaleCode: 'AS_20240315_003',
    orderIndex: 2,
    submittedAt: new Date('2024-03-15 16:30:00'),
    refundedAt: null,
    refundChannel: '抖音平台退款',
    approvalUrl: 'https://example.com/approval/AS_20240315_003',
    creatorType: 'finance',
    refundAmount: 800.0,
    refundReason: '学员搬家，无法继续学习',
    benefitEndedAt: null,
    benefitUsedDays: 74,
    applicantName: '学员C',
    isFinancialSettled: false,
    financialSettledAt: null,
    financialNote: null,
    productCategory: '会员',
  },
  // 资料包的退款（已拒绝）
  {
    afterSaleCode: 'AS_20240220_004',
    orderIndex: 4,
    submittedAt: new Date('2024-02-20 11:45:00'),
    refundedAt: null,
    refundChannel: '抖音平台退款',
    approvalUrl: 'https://example.com/approval/AS_20240220_004',
    creatorType: 'admin',
    refundAmount: 0.0,
    refundReason: '已下载资料，不符合退款条件',
    benefitEndedAt: null,
    benefitUsedDays: 5,
    applicantName: '学员E',
    isFinancialSettled: true,
    financialSettledAt: new Date('2024-02-22'),
    financialNote: '退款申请被拒绝',
    productCategory: '资料',
  },
];

// ==================== 辅助函数 ====================

/**
 * 将退款配置转换为 Prisma 创建输入格式
 */
function convertToRefundCreateInput(
  config: RefundConfig,
  orderId: string,
  creatorId: string,
): Prisma.OrderRefundUncheckedCreateInput {
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

// ==================== 主函数 ====================

/**
 * 创建退款数据
 *
 * @param prisma - Prisma 客户端实例
 * @param params - 创建参数，包含用户和订单数据
 * @returns 创建的退款记录数组
 */
export async function createRefunds(
  prisma: PrismaClient,
  params: CreateRefundsParams,
): Promise<OrderRefund[]> {
  console.log('💰 开始创建退款数据...');

  const { users, orders } = params;
  const { adminUser, financeUser } = users;

  try {
    // 并行创建所有退款记录
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

    // 输出创建结果
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
