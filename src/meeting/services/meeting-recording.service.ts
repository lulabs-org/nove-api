import { Injectable } from '@nestjs/common';
import { MeetingRecordingRepository } from '../repositories/meeting-recording.repository';
import { RecordingNotFoundException } from '../exceptions/meeting.exceptions';
import {
  QueryMeetingRecordingDto,
  UpdateMeetingRecordingDto,
  CreateMeetingRecordingDto,
} from '../dto/meeting-recording.dto';

@Injectable()
export class MeetingRecordingService {
  constructor(
    private readonly meetingRecordingRepository: MeetingRecordingRepository,
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

  async findMany(query: QueryMeetingRecordingDto) {
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

  async create(data: CreateMeetingRecordingDto) {
    return this.meetingRecordingRepository.create(data);
  }

  async update(id: string, updateData: UpdateMeetingRecordingDto) {
    await this.getById(id);
    return this.meetingRecordingRepository.update(id, updateData);
  }

  async delete(id: string) {
    const recording = await this.getById(id);
    await this.meetingRecordingRepository.delete(id);
    return { success: true, data: recording, deletedAt: new Date() };
  }
}
