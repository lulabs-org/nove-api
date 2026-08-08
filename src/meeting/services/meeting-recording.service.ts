import { Injectable } from '@nestjs/common';
import { MeetingRecordingRepository } from '../repositories/meeting-recording.repository';
import { RecordingNotFoundException } from '../exceptions/meeting.exceptions';

@Injectable()
export class MeetingRecordingService {
  constructor(private readonly meetingRecordingRepository: MeetingRecordingRepository) { }

  /**
   * 获取录制记录详情
   */
  async getById(id: string) {
    const recording = await this.meetingRecordingRepository.findById(id);
    if (!recording) {
      throw new RecordingNotFoundException(id);
    }
    return recording;
  }
}
