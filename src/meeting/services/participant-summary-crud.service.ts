import { Injectable, NotFoundException } from '@nestjs/common';
import { GenerationMethod } from '@prisma/client';
import { MinuteParticipantSummaryRepository } from '../repositories';
import {
  CreateMinuteParticipantSummaryDto,
  UpdateMinuteParticipantSummaryDto,
} from '../dto/participant-summary.dto';

@Injectable()
export class ParticipantSummaryCrudService {
  constructor(
    private readonly summaries: MinuteParticipantSummaryRepository,
  ) {}

  async findById(meetingId: string, minuteId: string, id: string) {
    const summary = await this.summaries.findById(meetingId, minuteId, id);
    if (!summary)
      throw new NotFoundException(
        `Recording participant summary ${id} not found`,
      );
    return summary;
  }

  async findMany(meetingId: string, minuteId: string, page = 1, limit = 20) {
    const result = await this.summaries.findMany(
      meetingId,
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

  async create(
    meetingId: string,
    minuteId: string,
    data: CreateMinuteParticipantSummaryDto,
  ) {
    if (
      !(await this.summaries.recordingBelongsToMeeting(meetingId, minuteId))
    ) {
      throw new NotFoundException(
        `Recording ${minuteId} not found in meeting ${meetingId}`,
      );
    }
    return this.summaries.saveNewVersion({
      ...data,
      meetingId,
      minuteId: minuteId,
      generatedBy: GenerationMethod.MANUAL,
    });
  }

  async update(
    meetingId: string,
    minuteId: string,
    id: string,
    data: UpdateMinuteParticipantSummaryDto,
  ) {
    const current = await this.findById(meetingId, minuteId, id);
    return this.summaries.saveNewVersion({
      meetingId,
      minuteId: minuteId,
      platformUserId: current.platformUserId,
      userName: data.userName ?? current.userName,
      partSummary: data.partSummary ?? current.partSummary,
      keywords: data.keywords ?? current.keywords,
      generatedBy: GenerationMethod.MANUAL,
      meetingParticipantId: current.meetingParticipantId,
      observedStartAt: current.observedStartAt,
      observedEndAt: current.observedEndAt,
    });
  }

  async delete(meetingId: string, minuteId: string, id: string) {
    await this.findById(meetingId, minuteId, id);
    const data = await this.summaries.softDelete(meetingId, minuteId, id);
    return { success: true, data };
  }
}
