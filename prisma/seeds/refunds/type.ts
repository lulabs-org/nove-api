import { Order, RefundChannel, RefundStatus, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface CreateRefundsParams {
  users: {
    adminUser: User;
    financeUser: User;
    normalUsers: User[];
  };
  orders: Order[];
}

export interface RefundConfig {
  afterSaleCode: string;
  orderIndex: number;
  submittedAt: Date;
  refundedAt: Date | null;
  refundChannel: RefundChannel;
  approvalUrl: string;
  creatorType: 'admin' | 'finance';
  refundAmount: number; // 存储最小货币单位（分）
  refundReason: string;
  benefitUsedDays: number;
  applicantName: string;
  status: RefundStatus;
  financialSettledAt: Date | null;
  financialNote: string | null;
  productCategory: string;
}

export type RefundCreateInput = Prisma.OrderRefundUncheckedCreateInput;
