import { Injectable } from '@nestjs/common';
import { Prisma, TrackingCadence, TrackingReportType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { retryVersionTransaction } from '@/common/utils/prisma-transaction-retry';

export type TrackingReportCreate = Omit<
  Prisma.UserTrackingReportUncheckedCreateInput,
  'versionGroupKey' | 'version' | 'isLatest' | 'previousReportId'
> & { recordingSummaryIds?: string[]; sourceReportIds?: string[] };

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
    const { recordingSummaryIds = [], sourceReportIds = [], ...report } = data;
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
          if (recordingSummaryIds.length) {
            await tx.trackingReportRecordingSummarySource.createMany({
              data: [...new Set(recordingSummaryIds)].map(
                (recordingSummaryId) => ({
                  reportId: created.id,
                  recordingSummaryId,
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
      include: { recordingSummarySources: true, sourceReports: true },
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
    subjectUserIds?: string[],
    trackingType: TrackingReportType = TrackingReportType.PERIODIC_MEETING_SUMMARY,
  ) {
    return this.prisma.userTrackingReport.findMany({
      where: {
        trackingType,
        cadence,
        platformUserId: platformUserIds?.length
          ? { in: platformUserIds }
          : undefined,
        subjectUserId: subjectUserIds?.length
          ? { in: subjectUserIds }
          : undefined,
        periodStart: { gte: range.periodStart },
        periodEnd: { lte: range.periodEnd },
        isLatest: true,
        deletedAt: null,
      },
    });
  }
}
