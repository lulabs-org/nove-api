import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateTrackingReportDto,
  TrackingReportSourceInputDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';

export type CreateTrackingReportData = Omit<
  CreateTrackingReportDto,
  'baseDate'
> & {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
};

const targetSummarySelect = {
  id: true,
  targetType: true,
  targetId: true,
  nameSnapshot: true,
} satisfies Prisma.TrackingTargetSelect;

export const trackingReportListSelect = {
  id: true,
  target: { select: targetSummarySelect },
  trackingType: true,
  cadence: true,
  periodKey: true,
  periodStart: true,
  periodEnd: true,
  timezone: true,
  generatedBy: true,
  aiModel: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { sources: true } },
} satisfies Prisma.TrackingReportSelect;

export const trackingReportDetailSelect = {
  ...trackingReportListSelect,
  content: true,
  target: {
    select: {
      ...targetSummarySelect,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  sources: {
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.TrackingReportSelect;

export type TrackingReportListRecord = Prisma.TrackingReportGetPayload<{
  select: typeof trackingReportListSelect;
}>;
export type TrackingReportDetailRecord = Prisma.TrackingReportGetPayload<{
  select: typeof trackingReportDetailSelect;
}>;

function sourceData(sources: TrackingReportSourceInputDto[]) {
  return sources.map((source) => ({
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    metadata: (source.metadata ?? {}) as Prisma.InputJsonValue,
  }));
}

@Injectable()
export class TrackingReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTrackingReportData) {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.trackingTarget.upsert({
        where: {
          targetType_targetId: {
            targetType: dto.targetType,
            targetId: dto.targetId,
          },
        },
        create: {
          targetType: dto.targetType,
          targetId: dto.targetId,
          nameSnapshot: dto.targetName,
          metadata: (dto.targetMetadata ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          nameSnapshot: dto.targetName,
          ...(dto.targetMetadata === undefined
            ? {}
            : { metadata: dto.targetMetadata as Prisma.InputJsonValue }),
        },
      });
      return tx.trackingReport.create({
        data: {
          targetId: target.id,
          trackingType: dto.trackingType,
          cadence: dto.cadence,
          periodKey: dto.periodKey,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
          timezone: dto.timezone,
          content: dto.content,
          generatedBy: dto.generatedBy,
          aiModel: dto.aiModel,
          sources: dto.sources?.length
            ? {
                createMany: {
                  data: sourceData(dto.sources),
                  skipDuplicates: true,
                },
              }
            : undefined,
        },
        select: trackingReportDetailSelect,
      });
    });
  }

  findById(id: string) {
    return this.prisma.trackingReport.findFirst({
      where: { id, deletedAt: null },
      select: trackingReportDetailSelect,
    });
  }

  async findMany(
    where: Prisma.TrackingReportWhereInput,
    skip: number,
    take: number,
  ) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.trackingReport.count({ where }),
      this.prisma.trackingReport.findMany({
        where,
        skip,
        take,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        select: trackingReportListSelect,
      }),
    ]);
    return { total, data };
  }

  async update(id: string, dto: UpdateTrackingReportDto) {
    const { sources, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (sources !== undefined) {
        await tx.trackingReportSource.deleteMany({ where: { reportId: id } });
        if (sources.length) {
          await tx.trackingReportSource.createMany({
            data: sourceData(sources).map((source) => ({
              ...source,
              reportId: id,
            })),
            skipDuplicates: true,
          });
        }
      }
      return tx.trackingReport.update({
        where: { id },
        data,
        select: trackingReportDetailSelect,
      });
    });
  }

  softDelete(id: string) {
    return this.prisma.trackingReport.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
