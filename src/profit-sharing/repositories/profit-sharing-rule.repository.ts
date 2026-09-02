import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfitSharingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithDetails(data: Prisma.ProfitShareRuleCreateInput) {
    return this.prisma.profitShareRule.create({
      data,
      include: {
        modules: {
          include: {
            allocations: true,
          },
        },
      },
    });
  }

  updateWithDetails(id: string, data: Prisma.ProfitShareRuleUpdateInput) {
    return this.prisma.profitShareRule.update({
      where: { id },
      data,
      include: {
        modules: {
          include: {
            allocations: true,
          },
        },
      },
    });
  }

  findByIdWithDetails(id: string) {
    return this.prisma.profitShareRule.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            allocations: true,
          },
        },
      },
    });
  }

  findAllWithDetails() {
    return this.prisma.profitShareRule.findMany({
      include: {
        modules: {
          include: {
            allocations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveRulesForOrder(financialClosedAt: Date, productId: string | null, channelId: number | null) {
    return this.prisma.profitShareRule.findMany({
      where: {
        status: 'ACTIVE',
        validStartTime: { lte: financialClosedAt },
        validEndTime: { gte: financialClosedAt },
        OR: [
          { productId, channelId },
          { productId: null, channelId },
          { productId, channelId: null },
          { productId: null, channelId: null },
        ],
      },
      include: {
        modules: {
          include: { allocations: true },
        },
      },
    });
  }
}
