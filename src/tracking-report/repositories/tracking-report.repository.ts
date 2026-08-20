import { Injectable } from '@nestjs/common';
import { Prisma, TrackingCadence, TrackingReportType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';

export type TrackingReportCreate = Omit<
  Prisma.UserTrackingReportUncheckedCreateInput,
  'versionGroupKey' | 'version' | 'isLatest' | 'previousReportId'
> & { minuteSummaryIds?: string[]; sourceReportIds?: string[] };

const trackingReportSubjectSummarySelect = {
  subjectUser: {
    select: {
      profile: {
        select: {
          displayName: true,
          avatar: true,
        },
      },
    },
  },
  platformUser: {
    select: {
      displayName: true,
    },
  },
  project: {
    select: {
      title: true,
      image: true,
    },
  },
} satisfies Prisma.UserTrackingReportSelect;

const trackingReportSubjectDetailSelect = {
  subjectUser: {
    select: {
      id: true,
      username: true,
      email: true,
      countryCode: true,
      phone: true,
      profile: {
        select: {
          displayName: true,
          avatar: true,
        },
      },
    },
  },
  platformUser: {
    select: {
      id: true,
      platform: true,
      ptUserId: true,
      ptUnionId: true,
      displayName: true,
    },
  },
  project: {
    select: {
      id: true,
      title: true,
      subtitle: true,
      category: true,
      image: true,
    },
  },
} satisfies Prisma.UserTrackingReportSelect;

export const trackingReportListSelect = {
  id: true,
  subjectUserId: true,
  platformUserId: true,
  projectId: true,
  subjectNameSnapshot: true,
  trackingType: true,
  cadence: true,
  periodStart: true,
  periodEnd: true,
  isLatest: true,
  version: true,
  createdAt: true,
  ...trackingReportSubjectSummarySelect,
} satisfies Prisma.UserTrackingReportSelect;

export type TrackingReportListRecord = Prisma.UserTrackingReportGetPayload<{
  select: typeof trackingReportListSelect;
}>;

const trackingReportSubjectDetailRecordSelect = {
  subjectUserId: true,
  platformUserId: true,
  projectId: true,
  subjectNameSnapshot: true,
  trackingType: true,
  ...trackingReportSubjectDetailSelect,
} satisfies Prisma.UserTrackingReportSelect;

export type TrackingReportSubjectDetailRecord =
  Prisma.UserTrackingReportGetPayload<{
    select: typeof trackingReportSubjectDetailRecordSelect;
  }>;

@Injectable()
export class TrackingReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupKey(
    data: Pick<
      TrackingReportCreate,
      | 'subjectUserId'
      | 'platformUserId'
      | 'trackingType'
      | 'cadence'
      | 'periodStart'
      | 'periodEnd'
      | 'projectId'
    >,
  ) {
    const identity = data.subjectUserId
      ? `user:${data.subjectUserId}`
      : `platform:${data.platformUserId}`;
    return [
      identity,
      data.trackingType,
      data.cadence,
      new Date(data.periodStart).getTime(),
      new Date(data.periodEnd).getTime(),
      data.projectId ?? '-',
    ].join(':');
  }

  async saveNewVersion(data: TrackingReportCreate) {
    const { minuteSummaryIds = [], sourceReportIds = [], ...report } = data;
    const versionGroupKey = this.groupKey(data);
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const previous = await tx.userTrackingReport.findFirst({
            where: { versionGroupKey, isLatest: true, deletedAt: null },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
          });
          if (previous)
            await tx.userTrackingReport.update({
              where: { id: previous.id },
              data: { isLatest: false },
            });
          const created = await tx.userTrackingReport.create({
            data: {
              ...report,
              structuredData: report.structuredData ?? {},
              schemaVersion: 1,
              versionGroupKey,
              version: (previous?.version ?? 0) + 1,
              previousReportId: previous?.id,
              isLatest: true,
            },
          });
          if (minuteSummaryIds.length) {
            await tx.trackingReportMinuteSummarySource.createMany({
              data: [...new Set(minuteSummaryIds)].map(
                (minuteSummaryId) => ({
                  reportId: created.id,
                  minuteSummaryId,
                }),
              ),
              skipDuplicates: true,
            });
          }
          if (sourceReportIds.length) {
            await tx.trackingReportSourceReport.createMany({
              data: [...new Set(sourceReportIds)].map((sourceReportId) => ({
                reportId: created.id,
                sourceReportId,
              })),
              skipDuplicates: true,
            });
          }
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  findById(id: string) {
    return this.prisma.userTrackingReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        minuteSummarySources: true,
        sourceReports: true,
        ...trackingReportSubjectDetailSelect,
      },
    });
  }

  findSubjectByReportId(id: string) {
    return this.prisma.userTrackingReport.findFirst({
      where: { id, deletedAt: null },
      select: trackingReportSubjectDetailRecordSelect,
    });
  }

  async findMany(
    where: Prisma.UserTrackingReportWhereInput,
    skip: number,
    take: number,
  ) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.userTrackingReport.count({ where }),
      this.prisma.userTrackingReport.findMany({
        where,
        skip,
        take,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        select: trackingReportListSelect,
      }),
    ]);
    return { total, data };
  }

  async softDelete(id: string) {
    return retryVersionTransaction(() =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.userTrackingReport.findFirstOrThrow({
            where: { id, deletedAt: null },
          });
          await tx.userTrackingReport.update({
            where: { id },
            data: { deletedAt: new Date(), isLatest: false },
          });
          if (current.isLatest) {
            const previous = await tx.userTrackingReport.findFirst({
              where: {
                versionGroupKey: current.versionGroupKey,
                deletedAt: null,
              },
              orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
            });
            if (previous)
              await tx.userTrackingReport.update({
                where: { id: previous.id },
                data: { isLatest: true },
              });
          }
          return current;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  findPeriodicSummaries(
    cadence: TrackingCadence,
    range: { periodStart: Date; periodEnd: Date },
    platformUserIds?: string[],
    trackingType: TrackingReportType = TrackingReportType.PERIODIC_MEETING_SUMMARY,
  ) {
    return this.prisma.userTrackingReport.findMany({
      where: {
        trackingType,
        cadence,
        platformUserId: platformUserIds?.length
          ? { in: platformUserIds }
          : undefined,
        periodStart: { gte: range.periodStart },
        periodEnd: { lte: range.periodEnd },
        isLatest: true,
        deletedAt: null,
      },
    });
  }

  /**
   * 检查指定周期内是否已有 isLatest=true 的报告（用于业务层防重）。
   * - 若 platformUserIds 指定，只检查这些用户
   * - 若不指定，检查任意用户是否存在该周期报告
   */
  async countByPeriod(params: {
    cadence: TrackingCadence;
    periodStart: Date;
    periodEnd: Date;
    trackingType: TrackingReportType;
    platformUserIds?: string[];
  }): Promise<number> {
    return this.prisma.userTrackingReport.count({
      where: {
        cadence: params.cadence,
        trackingType: params.trackingType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        isLatest: true,
        deletedAt: null,
        ...(params.platformUserIds?.length
          ? { platformUserId: { in: params.platformUserIds } }
          : {}),
      },
    });
  }
}
