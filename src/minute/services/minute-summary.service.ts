import { Injectable } from '@nestjs/common';
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
  ) { }

  async findByMinuteId(minuteId: string) {
    const summary =
      await this.meetingSummaryRepository.findByMinuteId(minuteId);
    if (!summary) {
      throw new MinuteSummaryNotFoundException(minuteId); // Note: You might want a better error message as minuteId is used here instead of summary id.
    }
    return summary;
  }

  async create(minuteId: string, data: CreateMinuteSummaryDto) {
    const { minuteId: _, ...restData } = data;
    return this.meetingSummaryRepository.upsert(minuteId, restData);
  }

  async update(minuteId: string, data: UpdateMinuteSummaryDto) {
    await this.findByMinuteId(minuteId); // Ensure exists

    const { minuteId: _, ...restData } = data;
    return this.meetingSummaryRepository.update(minuteId, restData);
  }

  async delete(minuteId: string) {
    const summary = await this.findByMinuteId(minuteId);
    await this.meetingSummaryRepository.delete(minuteId);
    return { success: true, data: summary, deletedAt: new Date() };
  }
}
