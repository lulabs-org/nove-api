import { Injectable } from '@nestjs/common';
import { MeetingSummaryRepository } from '../repositories/meeting-summary.repository';
import { MeetingSummaryNotFoundException } from '../exceptions/meeting.exceptions';

@Injectable()
export class MeetingSummaryService {
  constructor(private readonly meetingSummaryRepository: MeetingSummaryRepository) {}

  /**
   * 根据会议 ID 获取最新的会议总结
   */
  async getByMeetingId(meetingId: string) {
    const summary = await this.meetingSummaryRepository.findByMeetingId(meetingId);
    if (!summary) {
      throw new MeetingSummaryNotFoundException(meetingId);
    }
    return summary;
  }
}
