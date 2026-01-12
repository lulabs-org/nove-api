import { Order, User } from '@prisma/client';
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

export type RefundCreateInput = Prisma.OrderRefundUncheckedCreateInput;
