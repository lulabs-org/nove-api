import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SummaryRelationRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: Prisma.SummaryRelationUncheckedCreateInput) {
    return this.prisma.summaryRelation.create({
      data,
    });
  }

  async createMany(
    data: Prisma.SummaryRelationUncheckedCreateInput[],
  ) {
    if (!data.length) return;
    return this.prisma.summaryRelation.createMany({
      data,
    });
  }
}
