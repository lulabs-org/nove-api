import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateTrackingReportDto,
  QueryTrackingReportDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { calculateTrackingReportPeriod } from '../utils/report-period';

@Injectable()
export class TrackingReportService {
  constructor(private readonly reports: TrackingReportRepository) {}

  private validatePeriod(periodStart: Date, periodEnd: Date) {
    if (periodStart > periodEnd) {
      throw new BadRequestException('periodStart 不能晚于 periodEnd');
    }
  }

  private mapReport<T extends { _count: { sources: number } }>(report: T) {
    const { _count, ...data } = report;
    return { ...data, sourceCount: _count.sources };
  }

  private mapPrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('该追踪目标和周期已存在同类型报告');
    }
    throw error;
  }

  async create(dto: CreateTrackingReportDto) {
    const { baseDate, ...data } = dto;
    const period = calculateTrackingReportPeriod(
      dto.cadence,
      baseDate,
      dto.timezone,
    );
    try {
      return this.mapReport(await this.reports.create({ ...data, ...period }));
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  async get(id: string) {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException(`Tracking report ${id} not found`);
    return this.mapReport(report);
  }

  async list(query: QueryTrackingReportDto) {
    if (query.periodStart && query.periodEnd) {
      this.validatePeriod(query.periodStart, query.periodEnd);
    }
    const target =
      query.targetType || query.targetId || query.keyword
        ? {
            targetType: query.targetType,
            targetId: query.targetId,
            nameSnapshot: query.keyword
              ? { contains: query.keyword, mode: 'insensitive' as const }
              : undefined,
          }
        : undefined;
    const where: Prisma.TrackingReportWhereInput = {
      target,
      trackingType: query.trackingType,
      cadence: query.cadence,
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
      data: result.data.map((report) => this.mapReport(report)),
      total: result.total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async update(id: string, dto: UpdateTrackingReportDto) {
    const current = await this.reports.findById(id);
    if (!current)
      throw new NotFoundException(`Tracking report ${id} not found`);
    try {
      return this.mapReport(await this.reports.update(id, dto));
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  async delete(id: string) {
    const current = await this.reports.findById(id);
    if (!current)
      throw new NotFoundException(`Tracking report ${id} not found`);
    return { success: true, data: await this.reports.softDelete(id) };
  }
}
