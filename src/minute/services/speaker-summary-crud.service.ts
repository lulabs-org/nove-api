import { Injectable, NotFoundException } from '@nestjs/common';
import { GenerationMethod } from '@prisma/client';
import { SpeakerSummaryRepository } from '../repositories';
import {
  CreateSpeakerSummaryDto,
  UpdateSpeakerSummaryDto,
} from '../dto/speaker-summary.dto';

@Injectable()
export class SpeakerSummaryCrudService {
  constructor(private readonly summaries: SpeakerSummaryRepository) {}

  async findById(minuteId: string, id: string) {
    const summary = await this.summaries.findById(minuteId, id);
    if (!summary)
      throw new NotFoundException(
        `Recording participant summary ${id} not found`,
      );
    return summary;
  }

  async findMany(minuteId: string, page = 1, limit = 20) {
    const result = await this.summaries.findMany(
      minuteId,
      (page - 1) * limit,
      limit,
    );
    return {
      data: result.records,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async create(minuteId: string, data: CreateSpeakerSummaryDto) {
    return this.summaries.saveNewVersion({
      ...data,
      minuteId: minuteId,
      generatedBy: GenerationMethod.MANUAL,
    });
  }

  async update(minuteId: string, id: string, data: UpdateSpeakerSummaryDto) {
    const current = await this.findById(minuteId, id);
    return this.summaries.saveNewVersion({
      minuteId: minuteId,
      platformUserId: current.platformUserId,
      partSummary: data.partSummary ?? current.partSummary,
      keywords: data.keywords ?? current.keywords,
      generatedBy: GenerationMethod.MANUAL,
    });
  }

  async delete(minuteId: string, id: string) {
    await this.findById(minuteId, id);
    const data = await this.summaries.delete(minuteId, id);
    return { success: true, data };
  }
}
