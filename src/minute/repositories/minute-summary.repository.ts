import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, Prisma } from '@prisma/client';

type CreateInput = Prisma.MinuteSummaryUncheckedCreateInput;

@Injectable()
export class MinuteSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(minuteId: string, data: Omit<CreateInput, 'minuteId'>) {
    return this.prisma.minuteSummary.upsert({
      where: { minuteId },
      create: {
        ...data,
        minuteId,
        generatedBy: data.generatedBy || GenerationMethod.AI,
        aiModel: data.aiModel || 'tencent-meeting-ai',
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async findByMinuteId(minuteId: string) {
    return this.prisma.minuteSummary.findUnique({
      where: { minuteId },
    });
  }

  async update(minuteId: string, data: Prisma.MinuteSummaryUpdateInput) {
    return this.prisma.minuteSummary.update({
      where: { minuteId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(minuteId: string) {
    return this.prisma.minuteSummary.delete({
      where: { minuteId },
    });
  }
}
