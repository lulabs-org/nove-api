import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TrackingReportType } from '@prisma/client';
import {
  CreateTrackingReportDto,
  QueryTrackingReportDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';

@Injectable()
export class TrackingReportService {
  constructor(private readonly reports: TrackingReportRepository) {}

  private validate(data: CreateTrackingReportDto) {
    if (!data.subjectUserId && !data.platformUserId)
      throw new BadRequestException(
        'subjectUserId 或 platformUserId 至少提供一个',
      );
    if (data.periodStart > data.periodEnd)
      throw new BadRequestException('periodStart 不能晚于 periodEnd');
    if (
      data.trackingType === TrackingReportType.PROJECT_PROGRESS &&
      !data.projectId
    )
      throw new BadRequestException('PROJECT_PROGRESS 必须提供 projectId');
    if (
      data.trackingType !== TrackingReportType.PROJECT_PROGRESS &&
      data.projectId
    )
      throw new BadRequestException('仅 PROJECT_PROGRESS 可以提供 projectId');
  }

  create(
    dto: CreateTrackingReportDto,
    overrides?: Partial<Prisma.UserTrackingReportUncheckedCreateInput>,
  ) {
    this.validate(dto);
    return this.reports.saveNewVersion({
      ...dto,
      structuredData: dto.structuredData as Prisma.InputJsonValue | undefined,
      ...overrides,
    });
  }

  async get(id: string) {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException(`Tracking report ${id} not found`);
    return report;
  }

  async list(query: QueryTrackingReportDto) {
    const where: Prisma.UserTrackingReportWhereInput = {
      subjectUserId: query.subjectUserId,
      platformUserId: query.platformUserId,
      projectId: query.projectId,
      trackingType: query.trackingType,
      cadence: query.cadence,
      isLatest: query.isLatest,
      deletedAt: null,
      periodStart: query.periodStart ? { gte: query.periodStart } : undefined,
      periodEnd: query.periodEnd ? { lte: query.periodEnd } : undefined,
    };
    const result = await this.reports.findMany(
      where,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return {
      ...result,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async update(id: string, dto: UpdateTrackingReportDto) {
    const current = await this.get(id);
    const merged: CreateTrackingReportDto = {
      subjectUserId: current.subjectUserId ?? undefined,
      platformUserId: current.platformUserId ?? undefined,
      projectId: current.projectId ?? undefined,
      subjectNameSnapshot:
        dto.subjectNameSnapshot ?? current.subjectNameSnapshot,
      trackingType: current.trackingType,
      cadence: current.cadence,
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
      timezone: dto.timezone ?? current.timezone,
      content: dto.content ?? current.content,
      structuredData:
        dto.structuredData ??
        (current.structuredData as Record<string, unknown>),
      recordingSummaryIds:
        dto.recordingSummaryIds ??
        current.recordingSummarySources.map(
          (source) => source.recordingSummaryId,
        ),
      sourceReportIds:
        dto.sourceReportIds ??
        current.sourceReports.map((source) => source.sourceReportId),
    };
    this.validate(merged);
    return this.create(merged);
  }

  async delete(id: string) {
    await this.get(id);
    return { success: true, data: await this.reports.softDelete(id) };
  }
}
