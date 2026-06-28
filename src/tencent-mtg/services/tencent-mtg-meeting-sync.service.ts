import { Injectable } from '@nestjs/common';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories/meeting-recording.repository';
import { MeetingPlatform, RecordingSource } from '@prisma/client';
import type {
  RecordMeeting,
  RecordFile,
} from '@/integrations/tencent-meeting/types';
import {
  TENCENT_MEETING_TYPE_RECURRING,
  computeSubMeetingId,
  mergeDateTime,
  convertMeetingType,
  mapRecordingState,
  mapRecordingFileStatus,
} from '../tencent-mtg-record.mapper';

@Injectable()
export class TencentMtgMeetingSyncService {
  constructor(
    private readonly tencentApi: TencentApiService,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
  ) {}

  /**
   * 从腾讯会议 API 获取更详细的会议信息，并 upsert 到本地数据库。
   * 会处理周期性会议的子会议逻辑，以及时间、状态的映射。
   */
  async upsertMeetingFromRecord(record: RecordMeeting, operatorId: string) {
    const detail = await this.tencentApi.getMeetingDetail(
      record.meeting_id,
      undefined,
      1,
      operatorId,
      1,
    );

    const meetingInfo = detail.meeting_info_list?.[0];

    const meetingType = meetingInfo?.meeting_type;
    const isRecurring = meetingType === TENCENT_MEETING_TYPE_RECURRING;
    const subMeetingId =
      isRecurring && meetingInfo
        ? computeSubMeetingId(record.media_start_time, meetingInfo.start_time)
        : '__ROOT__';

    const hasRecording =
      record.state === 3 && (record.record_files?.length ?? 0) > 0;
    const recordingStatus = mapRecordingState(record.state);
    const systemMeetingType = convertMeetingType(meetingType);

    const scheduledStartAt = isRecurring
      ? mergeDateTime(record.media_start_time, meetingInfo?.start_time)
      : meetingInfo?.start_time
        ? new Date(Number(meetingInfo.start_time) * 1000)
        : undefined;
    const scheduledEndAt = isRecurring
      ? mergeDateTime(record.media_start_time, meetingInfo?.end_time)
      : meetingInfo?.end_time
        ? new Date(Number(meetingInfo.end_time) * 1000)
        : undefined;

    const timezone = meetingInfo?.time_zone
      ? Buffer.from(meetingInfo.time_zone, 'base64').toString('utf-8')
      : undefined;

    return this.meetingRepo.upsert(
      MeetingPlatform.TENCENT_MEETING,
      record.meeting_id,
      subMeetingId,
      {
        title: meetingInfo?.subject ?? record.subject,
        meetingCode: meetingInfo?.meeting_code ?? record.meeting_code,
        type: systemMeetingType,
        scheduledStartAt,
        timezone,
        scheduledEndAt,
        hasRecording,
        recordingStatus,
        metadata: {
          meeting_record_id: record.meeting_record_id,
          userid: record.userid,
          record_type: record.record_type,
          tencent_meeting_type: meetingType,
          status: meetingInfo?.status,
        },
      },
    );
  }

  /**
   * 将录制文件元数据（开始时间、结束时间、状态等）保存到本地数据库。
   */
  async upsertRecordingFromFile(
    meetingId: string,
    file: RecordFile,
    state: number,
  ) {
    return this.recordingRepo.upsert({
      meetingId,
      externalId: file.record_file_id,
      source: RecordingSource.PLATFORM_AUTO,
      status: mapRecordingFileStatus(state),
      startAt: new Date(file.record_start_time),
      endAt: new Date(file.record_end_time),
    });
  }
}
