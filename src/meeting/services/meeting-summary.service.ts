import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MinuteSummaryRepository } from '../repositories/meeting-summary.repository';
import { MinuteSummaryNotFoundException } from '../exceptions/meeting.exceptions';
import {
  CreateMinuteSummaryDto,
  UpdateMinuteSummaryDto,
} from '../dto/meeting-summary.dto';

@Injectable()
export class MinuteSummaryService {
  constructor(
    private readonly meetingSummaryRepository: MinuteSummaryRepository,
  ) {}

  async upsert(data: Prisma.MinuteSummaryUncheckedCreateInput) {
    return this.meetingSummaryRepository.upsert(data);
  }

  async getByMeetingId(meetingId: string) {
    const summary =
      await this.meetingSummaryRepository.findByMeetingId(meetingId);
    if (!summary) {
      throw new MinuteSummaryNotFoundException(meetingId);
    }
    return summary;
  }

  async findById(id: string) {
    const summary = await this.meetingSummaryRepository.findById(id);
    if (!summary) {
      throw new MinuteSummaryNotFoundException(id);
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

  async create(meetingId: string, data: CreateMinuteSummaryDto) {
    return this.meetingSummaryRepository.create({
      meetingId,
      ...data,
    });
  }

  async update(id: string, data: UpdateMinuteSummaryDto) {
    await this.findById(id); // Ensure exists
    return this.meetingSummaryRepository.update(id, data);
  }

  async delete(id: string) {
    const summary = await this.findById(id);
    await this.meetingSummaryRepository.delete(id);
    return { success: true, data: summary, deletedAt: new Date() };
  }
}
