import { Injectable, Logger } from '@nestjs/common';
import { MeetAiRepository } from '../repositories/meet-ai.repository';

@Injectable()
export class MeetAiService {
  private readonly logger = new Logger(MeetAiService.name);

  constructor(private readonly meetAiRepository: MeetAiRepository) {}

  async analyzeMeeting(meetingId: string) {
    this.logger.log(`分析会议: ${meetingId}`);
    return this.meetAiRepository.analyzeMeeting(meetingId);
  }

  async getMeetingSummary(meetingId: string) {
    this.logger.log(`获取会议摘要: ${meetingId}`);
    return this.meetAiRepository.getMeetingSummary(meetingId);
  }
}
