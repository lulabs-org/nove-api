import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfitSharingRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProfitShareRecordFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.ProfitShareRecordFindManyArgs>,
  ) {
    return this.prisma.profitShareRecord.findMany<T>(args);
  }

  createMany<T extends Prisma.ProfitShareRecordCreateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProfitShareRecordCreateManyArgs>,
  ) {
    return this.prisma.profitShareRecord.createMany<T>(args);
  }

  create<T extends Prisma.ProfitShareRecordCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProfitShareRecordCreateArgs>,
  ) {
    return this.prisma.profitShareRecord.create<T>(args);
  }

  update<T extends Prisma.ProfitShareRecordUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProfitShareRecordUpdateArgs>,
  ) {
    return this.prisma.profitShareRecord.update<T>(args);
  }

  updateMany<T extends Prisma.ProfitShareRecordUpdateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProfitShareRecordUpdateManyArgs>,
  ) {
    return this.prisma.profitShareRecord.updateMany<T>(args);
  }

  findRecordsWithDetails(args: { where?: Prisma.ProfitShareRecordWhereInput, skip?: number, take?: number } = {}) {
    return this.prisma.profitShareRecord.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take || 100,
      include: {
        order: {
          select: { orderNumber: true, amount: true },
        },
        rule: { select: { name: true } },
        module: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countRecords(where?: Prisma.ProfitShareRecordWhereInput) {
    return this.prisma.profitShareRecord.count({ where });
  }

  findRecordsForRefund(orderId: string) {
    return this.prisma.profitShareRecord.findMany({
      where: {
        orderId,
        module: {
          isRefundable: true,
        },
        status: {
          in: ['PENDING', 'SETTLED'],
        },
      },
    });
  }

  updatePendingRecordsToSettled() {
    return this.prisma.profitShareRecord.updateMany({
      where: {
        status: 'PENDING',
        settlementTime: {
          lte: new Date(),
        },
      },
      data: {
        status: 'SETTLED',
        updatedAt: new Date(),
      },
    });
  }
}
