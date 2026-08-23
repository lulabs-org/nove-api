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

  async findById(minuteId: string, summaryId: string) {
    const summary = await this.summaries.findById(minuteId, summaryId);
    if (!summary)
      throw new NotFoundException(
        `Recording participant summary ${summaryId} not found`,
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
    return this.summaries.upsert({
      ...data,
      minuteId: minuteId,
      generatedBy: data.generatedBy ?? GenerationMethod.MANUAL,
      aiModel: data.aiModel ?? null,
    });
  }

  async update(
    minuteId: string,
    summaryId: string,
    data: UpdateSpeakerSummaryDto,
  ) {
    const current = await this.findById(minuteId, summaryId);
    return this.summaries.update(summaryId, {
      partSummary: data.partSummary ?? current.partSummary,
      keywords: data.keywords ?? current.keywords,
      generatedBy: data.generatedBy ?? current.generatedBy,
      aiModel: data.aiModel ?? current.aiModel,
    });
  }

  async delete(minuteId: string, summaryId: string) {
    await this.findById(minuteId, summaryId);
    const data = await this.summaries.delete(summaryId);
    return { success: true, data };
  }
}
