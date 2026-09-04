import { ForbiddenException, Injectable } from '@nestjs/common';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { RecordingNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import {
  QueryMinuteDto,
  UpdateMinuteDto,
  CreateMinuteDto,
} from '../dto/minute.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MinuteService {
  constructor(
    private readonly meetingRecordingRepository: MinuteRepository,
    private readonly meetingSummaryRepository: MinuteSummaryRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取录制记录详情
   */
  async getById(id: string, orgId?: string) {
    const recording = await this.meetingRecordingRepository.findById(id, orgId);
    if (!recording) {
      throw new RecordingNotFoundException(id);
    }
    return recording;
  }

  async findMany(query: QueryMinuteDto, orgId?: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const { total, records } = await this.meetingRecordingRepository.findMany({
      search: query.search,
      meetingId: query.meetingId,
      source: query.source,
      skip,
      take: limit,
      orgId,
    });

    return {
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateMinuteDto, orgId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: data.meetingId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!meeting) throw new ForbiddenException('会议不属于当前组织');
    return this.meetingRecordingRepository.create(data);
  }

  async update(id: string, updateData: UpdateMinuteDto, orgId?: string) {
    await this.getById(id, orgId);
    if (updateData.meetingId && orgId) {
      const target = await this.prisma.meeting.count({
        where: { id: updateData.meetingId, orgId, deletedAt: null },
      });
      if (!target) throw new ForbiddenException('会议不属于当前组织');
    }
    return this.meetingRecordingRepository.update(id, updateData, orgId);
  }

  async delete(id: string, orgId?: string) {
    const recording = await this.getById(id, orgId);
    await this.meetingRecordingRepository.delete(id, orgId);
    return { success: true, data: recording, deletedAt: new Date() };
  }

  requireOrgId(orgId?: string | null): string {
    if (!orgId)
      throw new ForbiddenException('Current organization is required');
    return orgId;
  }
}
