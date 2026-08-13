import { Injectable } from '@nestjs/common';
import { OrderRefund, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const refundInclude = {
  order: {
    select: {
      id: true,
      orderCode: true,
      orderNumber: true,
      productName: true,
      amount: true,
      currency: true,
      email: true,
      phone: true,
    },
  },
  creator: {
    select: {
      id: true,
      username: true,
      email: true,
      profile: { select: { displayName: true } },
    },
  },
} satisfies Prisma.OrderRefundInclude;

export type OrderRefundWithRelations = Prisma.OrderRefundGetPayload<{
  include: typeof refundInclude;
}>;

@Injectable()
export class OrderRefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.OrderRefundCreateInput,
  ): Promise<OrderRefundWithRelations> {
    return this.prisma.orderRefund.create({ data, include: refundInclude });
  }

  findById(id: string): Promise<OrderRefundWithRelations | null> {
    return this.prisma.orderRefund.findUnique({
      where: { id },
      include: refundInclude,
    });
  }

  findByAfterSaleCode(afterSaleCode: string): Promise<OrderRefund | null> {
    return this.prisma.orderRefund.findUnique({ where: { afterSaleCode } });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.OrderRefundWhereInput;
    orderBy: Prisma.OrderRefundOrderByWithRelationInput[];
  }): Promise<{ items: OrderRefundWithRelations[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.orderRefund.findMany({ ...options, include: refundInclude }),
      this.prisma.orderRefund.count({ where: options.where }),
    ]);
    return { items, total };
  }

  update(
    id: string,
    data: Prisma.OrderRefundUpdateInput,
  ): Promise<OrderRefundWithRelations> {
    return this.prisma.orderRefund.update({
      where: { id },
      data,
      include: refundInclude,
    });
  }

  softDelete(id: string): Promise<OrderRefundWithRelations> {
    return this.update(id, { deletedAt: new Date() });
  }

  async orderExists(id: string): Promise<boolean> {
    return !!(await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    }));
  }

  async refundExists(id: string): Promise<boolean> {
    return !!(await this.prisma.orderRefund.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    }));
  }
}
