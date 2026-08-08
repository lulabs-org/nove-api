import { Injectable } from '@nestjs/common';
import { MeetingSummaryRepository } from '../repositories/meeting-summary.repository';
import { MeetingSummaryNotFoundException } from '../exceptions/meeting.exceptions';
import {
  CreateMeetingSummaryDto,
  UpdateMeetingSummaryDto,
} from '../dto/meeting-summary.dto';

@Injectable()
export class MeetingSummaryService {
  constructor(
    private readonly meetingSummaryRepository: MeetingSummaryRepository,
  ) {}

  async getByMeetingId(meetingId: string) {
    const summary =
      await this.meetingSummaryRepository.findByMeetingId(meetingId);
    if (!summary) {
      throw new MeetingSummaryNotFoundException(meetingId);
    }
    return summary;
  }

  async findById(id: string) {
    const summary = await this.meetingSummaryRepository.findById(id);
    if (!summary) {
      throw new MeetingSummaryNotFoundException(id);
    }
    return summary;
  }

  async findMany(meetingId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const { total, records } = await this.meetingSummaryRepository.findMany(
      meetingId,
      skip,
      limit,
    );
    return {
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(meetingId: string, data: CreateMeetingSummaryDto) {
    return this.meetingSummaryRepository.create({
      meetingId,
      ...data,
    });
  }

  async update(id: string, data: UpdateMeetingSummaryDto) {
    await this.findById(id); // Ensure exists
    return this.meetingSummaryRepository.update(id, data);
  }

  async delete(id: string) {
    const summary = await this.findById(id);
    await this.meetingSummaryRepository.delete(id);
    return { success: true, data: summary, deletedAt: new Date() };
  }
}
