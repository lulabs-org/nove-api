import { ForbiddenException, Injectable } from '@nestjs/common';
import { MinuteRepository } from '../repositories/minute.repository';
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
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取录制记录详情
   */
  async getById(id: string, orgId: string) {
    const recording = await this.meetingRecordingRepository.findById(id, orgId);
    if (!recording) {
      throw new RecordingNotFoundException(id);
    }
    return recording;
  }

  async findMany(query: QueryMinuteDto, orgId: string) {
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
    await this.assertMeetingOrganization(data.meetingId, orgId);
    return this.meetingRecordingRepository.create(data);
  }

  async update(id: string, updateData: UpdateMinuteDto, orgId: string) {
    await this.getById(id, orgId);
    if (updateData.meetingId !== undefined) {
      await this.assertMeetingOrganization(updateData.meetingId, orgId);
    }
    return this.meetingRecordingRepository.update(id, updateData, orgId);
  }

  async delete(id: string, orgId: string) {
    const recording = await this.getById(id, orgId);
    await this.meetingRecordingRepository.delete(id, orgId);
    return { success: true, data: recording, deletedAt: new Date() };
  }

  private async assertMeetingOrganization(meetingId: string, orgId: string) {
    if (!meetingId?.trim()) {
      throw new ForbiddenException('Meeting is required');
    }
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!meeting) {
      throw new ForbiddenException(
        'Meeting does not belong to current organization',
      );
    }
  }
}
