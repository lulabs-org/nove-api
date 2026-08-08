import { Injectable, NotFoundException } from '@nestjs/common';
import { ParticipantSummaryRepository } from '@/meet-ai/repositories';
import {
  CreateParticipantSummaryDto,
  UpdateParticipantSummaryDto,
} from '../dto/participant-summary.dto';

@Injectable()
export class ParticipantSummaryCrudService {
  constructor(
    private readonly participantSummaryRepo: ParticipantSummaryRepository,
  ) {}

  async findById(id: string) {
    const summary = await this.participantSummaryRepo.findById(id);
    if (!summary) {
      throw new NotFoundException(`ParticipantSummary with ID ${id} not found`);
    }
    return summary;
  }

  async findMany(meetingId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const { total, records } = await this.participantSummaryRepo.findMany(
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

  async create(meetingId: string, data: CreateParticipantSummaryDto) {
    return this.participantSummaryRepo.create({
      ...data,
      meetingId,
    });
  }

  async update(id: string, data: UpdateParticipantSummaryDto) {
    await this.findById(id); // Ensure exists
    return this.participantSummaryRepo.update(id, data);
  }

  async delete(id: string) {
    const summary = await this.findById(id);
    await this.participantSummaryRepo.delete(id);
    return { success: true, data: summary, deletedAt: new Date() };
  }
}
