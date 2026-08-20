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
import {
  TrackingReportListRecord,
  TrackingReportRepository,
  TrackingReportSubjectDetailRecord,
} from '../repositories/tracking-report.repository';

type TrackingReportSubjectSummarySource = Pick<
  TrackingReportListRecord,
  | 'subjectUserId'
  | 'platformUserId'
  | 'projectId'
  | 'subjectNameSnapshot'
  | 'subjectUser'
  | 'platformUser'
  | 'project'
  | 'trackingType'
>;

type TrackingReportSubjectDetailSource = TrackingReportSubjectDetailRecord;

@Injectable()
export class TrackingReportService {
  constructor(private readonly reports: TrackingReportRepository) {}

  private toSubjectSummary(report: TrackingReportSubjectSummarySource) {
    const localProfile = report.subjectUser?.profile;
    const project = report.project;

    if (
      report.trackingType === TrackingReportType.PROJECT_PROGRESS &&
      project
    ) {
      return {
        kind: 'PROJECT' as const,
        displayName: project.title,
        avatar: project.image,
        isLinked: Boolean(report.subjectUserId),
      };
    }

    if (report.subjectUserId) {
      return {
        kind: 'LOCAL_USER' as const,
        displayName: localProfile?.displayName ?? report.subjectNameSnapshot,
        avatar: localProfile?.avatar ?? null,
        isLinked: true,
      };
    }

    return {
      kind: 'PLATFORM_USER' as const,
      displayName:
        report.platformUser?.displayName ?? report.subjectNameSnapshot,
      avatar: null,
      isLinked: false,
    };
  }

  private toSubject(report: TrackingReportSubjectDetailSource) {
    const localUser = report.subjectUser
      ? {
          id: report.subjectUser.id,
          username: report.subjectUser.username,
          email: report.subjectUser.email,
          countryCode: report.subjectUser.countryCode,
          phone: report.subjectUser.phone,
          displayName: report.subjectUser.profile?.displayName ?? null,
          avatar: report.subjectUser.profile?.avatar ?? null,
        }
      : null;
    const platformUser = report.platformUser
      ? {
          id: report.platformUser.id,
          platform: report.platformUser.platform,
          ptUserId: report.platformUser.ptUserId,
          ptUnionId: report.platformUser.ptUnionId,
          displayName: report.platformUser.displayName,
        }
      : null;
    const project = report.project
      ? {
          id: report.project.id,
          title: report.project.title,
          subtitle: report.project.subtitle,
          category: report.project.category,
          image: report.project.image,
        }
      : null;

    if (
      report.trackingType === TrackingReportType.PROJECT_PROGRESS &&
      project
    ) {
      return {
        kind: 'PROJECT' as const,
        displayName: project.title,
        avatar: project.image,
        isLinked: Boolean(localUser),
        nameSnapshot: report.subjectNameSnapshot,
        localUser,
        platformUser,
        project,
      };
    }

    if (localUser) {
      const phone = localUser.phone
        ? `${localUser.countryCode ?? ''} ${localUser.phone}`.trim()
        : null;
      return {
        kind: 'LOCAL_USER' as const,
        displayName:
          localUser.displayName ??
          localUser.username ??
          localUser.email ??
          phone ??
          report.subjectNameSnapshot,
        avatar: localUser.avatar,
        isLinked: true,
        nameSnapshot: report.subjectNameSnapshot,
        localUser,
        platformUser,
        project,
      };
    }

    return {
      kind: 'PLATFORM_USER' as const,
      displayName: platformUser?.displayName ?? report.subjectNameSnapshot,
      avatar: null,
      isLinked: false,
      nameSnapshot: report.subjectNameSnapshot,
      localUser,
      platformUser,
      project,
    };
  }

  private mapListReport(report: TrackingReportListRecord) {
    const {
      subjectNameSnapshot,
      subjectUserId,
      platformUserId,
      projectId,
      subjectUser,
      platformUser,
      project,
      ...data
    } = report;
    return {
      ...data,
      subject: this.toSubjectSummary({
        subjectNameSnapshot,
        subjectUserId,
        platformUserId,
        projectId,
        trackingType: report.trackingType,
        subjectUser,
        platformUser,
        project,
      }),
    };
  }

  private mapReport<T extends TrackingReportSubjectDetailSource>(report: T) {
    const {
      subjectNameSnapshot,
      subjectUserId,
      platformUserId,
      projectId,
      subjectUser,
      platformUser,
      project,
      ...data
    } = report;
    return {
      ...data,
      subject: this.toSubject({
        subjectNameSnapshot,
        subjectUserId,
        platformUserId,
        projectId,
        trackingType: report.trackingType,
        subjectUser,
        platformUser,
        project,
      }),
    };
  }

  private async getRecord(id: string) {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException(`Tracking report ${id} not found`);
    return report;
  }

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
    return this.mapReport(await this.getRecord(id));
  }

  async getSubject(id: string) {
    const report = await this.reports.findSubjectByReportId(id);
    if (!report) throw new NotFoundException(`Tracking report ${id} not found`);
    return this.toSubject(report);
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
      total: result.total,
      data: result.data.map((report) => this.mapListReport(report)),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async update(id: string, dto: UpdateTrackingReportDto) {
    const current = await this.getRecord(id);
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
      minuteSummaryIds:
        dto.minuteSummaryIds ??
        current.minuteSummarySources.map((source) => source.minuteSummaryId),
      sourceReportIds:
        dto.sourceReportIds ??
        current.sourceReports.map((source) => source.sourceReportId),
    };
    this.validate(merged);
    return this.create(merged);
  }

  async delete(id: string) {
    await this.getRecord(id);
    return { success: true, data: await this.reports.softDelete(id) };
  }
}
