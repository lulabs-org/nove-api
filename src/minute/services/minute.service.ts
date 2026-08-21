import { Injectable } from '@nestjs/common';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { RecordingNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import { MinuteSummaryNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import {
  QueryMinuteDto,
  UpdateMinuteDto,
  CreateMinuteDto,
  CreateRecordingSummaryDto,
} from '../dto/minute.dto';

@Injectable()
export class MinuteService {
  constructor(
    private readonly meetingRecordingRepository: MinuteRepository,
    private readonly meetingSummaryRepository: MinuteSummaryRepository,
  ) {}

  /**
   * 获取录制记录详情
   */
  async getById(id: string) {
    const recording = await this.meetingRecordingRepository.findById(id);
    if (!recording) {
      throw new RecordingNotFoundException(id);
    }
    return recording;
  }

  async findMany(query: QueryMinuteDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const { total, records } = await this.meetingRecordingRepository.findMany({
      meetingId: query.meetingId,
      source: query.source,
      status: query.status,
      skip,
      take: limit,
    });

    return {
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateMinuteDto) {
    return this.meetingRecordingRepository.create(data);
  }

  async getSummary(id: string) {
    await this.getById(id);
    const summary = await this.meetingSummaryRepository.findByRecordingId(id);
    if (!summary) {
      throw new MinuteSummaryNotFoundException(id);
    }
    return summary;
  }

  async createSummary(id: string, data: CreateRecordingSummaryDto) {
    await this.getById(id);
    return this.meetingSummaryRepository.createExternalForRecording(id, {
      ...data,
      minuteId: id,
    });
  }

  async update(id: string, updateData: UpdateMinuteDto) {
    await this.getById(id);
    return this.meetingRecordingRepository.update(id, updateData);
  }

  async delete(id: string) {
    const recording = await this.getById(id);
    await this.meetingRecordingRepository.delete(id);
    return { success: true, data: recording, deletedAt: new Date() };
  }
}
