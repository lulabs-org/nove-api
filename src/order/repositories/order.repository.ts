import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const orderInclude = {
  product: {
    select: {
      id: true,
      productCode: true,
      name: true,
    },
  },
  purchaser: {
    select: {
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  channel: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  currentOwner: {
    select: {
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  financialCloser: {
    select: {
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrderCreateInput): Promise<OrderWithRelations> {
    return this.prisma.order.create({
      data,
      include: orderInclude,
    });
  }

  async findById(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  async findByOrderCode(orderCode: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { orderCode },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
    });
  }

  async findByChannelIdAndExternalId(
    channelId: number,
    externalId: string,
  ): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: {
        channelId_externalId: {
          channelId,
          externalId,
        },
      },
    });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.OrderWhereInput;
    orderBy: Prisma.OrderOrderByWithRelationInput;
  }): Promise<{ items: OrderWithRelations[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: options.where,
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy,
        include: orderInclude,
      }),
      this.prisma.order.count({ where: options.where }),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    data: Prisma.OrderUpdateInput,
  ): Promise<OrderWithRelations> {
    return this.prisma.order.update({
      where: { id },
      data,
      include: orderInclude,
    });
  }

  async softDelete(id: string): Promise<OrderWithRelations> {
    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: orderInclude,
    });
  }

  async productExists(id: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!product;
  }

  async findProductById(
    id: string,
  ): Promise<{ id: string; name: string } | null> {
    return this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  async userExists(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }

  async channelExists(id: number): Promise<boolean> {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!channel;
  }
}
