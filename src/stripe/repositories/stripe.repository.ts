import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type CreateOrderData = Prisma.OrderUncheckedCreateInput;
type UpdateOrderData = Prisma.OrderUncheckedUpdateInput;
type CreateRefundData = Prisma.OrderRefundUncheckedCreateInput;
type UpdateRefundData = Prisma.OrderRefundUncheckedUpdateInput;

@Injectable()
export class StripeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按外部订单号查找最新的未删除订单
   */
  async findOrderByExternalId(externalId: string) {
    return this.prisma.order.findFirst({
      where: {
        externalId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 按流水号查找未删除订单
   */
  async findOrderByProviderTradeNo(providerTradeNo: string) {
    return this.prisma.order.findFirst({
      where: {
        providerTradeNo,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 优先按 paymentIntentId，次优按 chargeId 查找本地订单
   */
  async findOrderByChargeOrIntent(chargeId?: string, paymentIntentId?: string) {
    const orConditions: Prisma.OrderWhereInput[] = [];
    if (paymentIntentId) {
      orConditions.push({ externalId: paymentIntentId });
      orConditions.push({ providerTradeNo: paymentIntentId });
    }
    if (chargeId) {
      orConditions.push({ providerTradeNo: chargeId });
      orConditions.push({ externalId: chargeId });
    }
    if (orConditions.length === 0) return null;

    return this.prisma.order.findFirst({
      where: {
        OR: orConditions,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 订单的幂等写入：存在则更新，不存在则创建
   */
  async upsertOrder(params: {
    externalId: string;
    create:
      | CreateOrderData
      | (() => CreateOrderData | Promise<CreateOrderData>);
    update: UpdateOrderData;
  }) {
    const existingOrder = await this.findOrderByExternalId(params.externalId);

    if (existingOrder) {
      const order = await this.prisma.order.update({
        where: { id: existingOrder.id },
        data: params.update,
      });

      return { action: 'updated' as const, order };
    }

    const createData =
      typeof params.create === 'function'
        ? await params.create()
        : params.create;
    const order = await this.prisma.order.create({
      data: createData,
    });

    return { action: 'created' as const, order };
  }

  /**
   * 按退款售后编号查找退款单
   */
  async findRefundByAfterSaleCode(afterSaleCode: string) {
    return this.prisma.orderRefund.findUnique({
      where: { afterSaleCode },
    });
  }

  /**
   * 幂等写入退款单
   */
  async upsertRefund(params: {
    afterSaleCode: string;
    create: CreateRefundData;
    update: UpdateRefundData;
  }) {
    return this.prisma.orderRefund.upsert({
      where: { afterSaleCode: params.afterSaleCode },
      create: params.create,
      update: params.update,
    });
  }
}
