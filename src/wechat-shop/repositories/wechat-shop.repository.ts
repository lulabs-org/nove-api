import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
type CreateOrderData = Prisma.OrderUncheckedCreateInput;
type UpdateOrderData = Prisma.OrderUncheckedUpdateInput;

@Injectable()
export class WechatShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按外部平台订单号查找最新的未删除订单。
   */
  async findLatestByExternalId(externalId: string) {
    return this.prisma.order.findFirst({
      where: {
        externalId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建订单记录。
   */
  async create(data: CreateOrderData) {
    return this.prisma.order.create({
      data,
    });
  }

  /**
   * 更新订单记录。
   */
  async update(id: string, data: UpdateOrderData) {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  /**
   * 订单的幂等写入：存在则更新，不存在则创建。
   */
  async upsert(params: {
    externalId: string;
    create:
      | CreateOrderData
      | (() => CreateOrderData | Promise<CreateOrderData>);
    update: UpdateOrderData;
  }) {
    const existingOrder = await this.findLatestByExternalId(params.externalId);

    if (existingOrder) {
      const order = await this.update(existingOrder.id, params.update);

      return { action: 'updated' as const, order };
    }

    const createData =
      typeof params.create === 'function'
        ? await params.create()
        : params.create;
    const order = await this.create(createData);

    return { action: 'created' as const, order };
  }
}
