import { Injectable, NotFoundException } from '@nestjs/common';
import { GenerationMethod } from '@prisma/client';
import { RecordingParticipantSummaryRepository } from '@/meet-ai/repositories';
import {
  CreateRecordingParticipantSummaryDto,
  UpdateRecordingParticipantSummaryDto,
} from '../dto/participant-summary.dto';

@Injectable()
export class ParticipantSummaryCrudService {
  constructor(
    private readonly summaries: RecordingParticipantSummaryRepository,
  ) {}

  async findById(meetingId: string, recordingId: string, id: string) {
    const summary = await this.summaries.findById(meetingId, recordingId, id);
    if (!summary)
      throw new NotFoundException(
        `Recording participant summary ${id} not found`,
      );
    return summary;
  }

  async findMany(meetingId: string, recordingId: string, page = 1, limit = 20) {
    const result = await this.summaries.findMany(
      meetingId,
      recordingId,
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
    recordingId: string,
    data: CreateRecordingParticipantSummaryDto,
  ) {
    if (
      !(await this.summaries.recordingBelongsToMeeting(meetingId, recordingId))
    ) {
      throw new NotFoundException(
        `Recording ${recordingId} not found in meeting ${meetingId}`,
      );
    }
    return this.summaries.saveNewVersion({
      ...data,
      meetingId,
      meetingRecordingId: recordingId,
      generatedBy: GenerationMethod.MANUAL,
    });
  }

  async update(
    meetingId: string,
    recordingId: string,
    id: string,
    data: UpdateRecordingParticipantSummaryDto,
  ) {
    const current = await this.findById(meetingId, recordingId, id);
    return this.summaries.saveNewVersion({
      meetingId,
      meetingRecordingId: recordingId,
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

  async delete(meetingId: string, recordingId: string, id: string) {
    await this.findById(meetingId, recordingId, id);
    const data = await this.summaries.softDelete(meetingId, recordingId, id);
    return { success: true, data };
  }
}
