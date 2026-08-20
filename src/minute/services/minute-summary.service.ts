import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { MinuteSummaryNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import {
  CreateMinuteSummaryDto,
  UpdateMinuteSummaryDto,
} from '../dto/minute-summary.dto';

@Injectable()
export class MinuteSummaryService {
  constructor(
    private readonly meetingSummaryRepository: MinuteSummaryRepository,
  ) {}

  async upsert(data: Prisma.MinuteSummaryUncheckedCreateInput) {
    return this.meetingSummaryRepository.upsert(data);
  }

  async getByMinuteId(minuteId: string) {
    const summary =
      await this.meetingSummaryRepository.findByMinuteId(minuteId);
    if (!summary) {
      throw new MinuteSummaryNotFoundException(minuteId);
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

  async findMany(minuteId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const { total, records } = await this.meetingSummaryRepository.findMany(
      minuteId,
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

  async create(minuteId: string, data: CreateMinuteSummaryDto) {
    return this.meetingSummaryRepository.create({
      ...data,
      minuteId,
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
