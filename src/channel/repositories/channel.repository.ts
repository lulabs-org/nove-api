import { Injectable } from '@nestjs/common';
import { Channel, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type ChannelWithOrderCount = Channel & { orderCount: number };

@Injectable()
export class ChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ChannelCreateInput,
  ): Promise<ChannelWithOrderCount> {
    const channel = await this.prisma.channel.create({ data });
    return { ...channel, orderCount: 0 };
  }

  async findById(id: number): Promise<ChannelWithOrderCount | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    return channel ? this.withOrderCount(channel) : null;
  }

  findByCode(code: string): Promise<Channel | null> {
    return this.prisma.channel.findUnique({ where: { code } });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.ChannelWhereInput;
    orderBy: Prisma.ChannelOrderByWithRelationInput[];
  }): Promise<{ items: ChannelWithOrderCount[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        ...options,
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.channel.count({ where: options.where }),
    ]);
    return { items: items.map((item) => this.withOrderCount(item)), total };
  }

  async update(
    id: number,
    data: Prisma.ChannelUpdateInput,
  ): Promise<ChannelWithOrderCount> {
    const channel = await this.prisma.channel.update({
      where: { id },
      data,
      include: { _count: { select: { orders: true } } },
    });
    return this.withOrderCount(channel);
  }

  delete(id: number): Promise<Channel> {
    return this.prisma.channel.delete({ where: { id } });
  }

  private withOrderCount<T extends Channel & { _count: { orders: number } }>(
    channel: T,
  ): ChannelWithOrderCount {
    const { _count, ...data } = channel;
    return { ...data, orderCount: _count.orders };
  }
}
