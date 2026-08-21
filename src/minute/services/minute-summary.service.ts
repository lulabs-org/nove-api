import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { MinuteSummaryNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import {
  CreateMinuteSummaryDto,
  UpdateMinuteSummaryDto,
} from '../dto/minute-summary.dto';
import { CreateRecordingSummaryDto } from '../dto/minute.dto';

@Injectable()
export class MinuteSummaryService {
  constructor(
    private readonly meetingSummaryRepository: MinuteSummaryRepository,
  ) {}

  async upsert(data: Prisma.MinuteSummaryUncheckedCreateInput) {
    return this.meetingSummaryRepository.upsert(data);
  }

  async findById(minuteId: string, id: string) {
    const summary = await this.meetingSummaryRepository.findById(id);
    if (!summary || summary.minuteId !== minuteId) {
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
    // 迁移原 POST /minutes/:id/summary 的多版本管理逻辑
    // 确保旧的 isLatest 为 false，新总结版本号递增
    return this.meetingSummaryRepository.createExternalForRecording(
      minuteId,
      data as unknown as CreateRecordingSummaryDto,
    );
  }

  async update(minuteId: string, id: string, data: UpdateMinuteSummaryDto) {
    await this.findById(minuteId, id); // Ensure exists
    return this.meetingSummaryRepository.update(id, data);
  }

  async delete(minuteId: string, id: string) {
    const summary = await this.findById(minuteId, id);
    await this.meetingSummaryRepository.delete(id);
    return { success: true, data: summary, deletedAt: new Date() };
  }
}
