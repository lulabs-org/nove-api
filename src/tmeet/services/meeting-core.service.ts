import { RecordingStatus } from '../../minute/enums/status.enum';
import { Injectable, Logger } from '@nestjs/common';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MinuteRepository } from '@/minute/repositories';
import {
  Platform,
  PlatformUser,
  Prisma,
  Meeting,
  Minute,
  RecordingSource,
} from '@prisma/client';
import { Meetuser, EventPayload, MeetingSessionInfo } from '../types';
import { TencentEventUtils } from '../utils/tencent-event.utils';
import type {
  RecordMeeting,
  RecordFile,
} from '../types';
import { TencentApiService } from '../client';
import {
  TENCENT_MEETING_TYPE_RECURRING,
  computeSubMeetingId,
  mergeDateTime,
  convertMeetingType,
  mapRecordingFileStatus,
} from '../mappers/tencent-mtg-record.mapper';

type MeetingData = Omit<
  Prisma.MeetingUncheckedCreateInput,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'platform'
  | 'meetingId'
  | 'subMeetingId'
>;

@Injectable()
export class TencentMtgMeetingCoreService {
  private readonly logger = new Logger(TencentMtgMeetingCoreService.name);

  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MinuteRepository,
    private readonly tencentApi: TencentApiService,
  ) {}

  // ==========================================
  // 从 Webhook 事件中处理会议入库
  // ==========================================
  async upsertMeetingFromWebhook(
    payload: EventPayload,
    event: string,
  ): Promise<Meeting> {
    const { meeting_info, operate_time } = payload;
    if (!meeting_info) {
      throw new Error('Meeting info is required but not provided');
    }

    const { creator } = meeting_info;
    const meetingType = TencentEventUtils.convertMeetingType(
      meeting_info.meeting_type as number,
    );
    const creatorUser = await this.upsertPtUser(creator as Meetuser);

    const meetingData: Partial<MeetingData> = {
      title: meeting_info.subject,
      meetingCode: meeting_info.meeting_code,
      type: meetingType,
      hostId: creatorUser.id,
      createdById: creatorUser.id,
      scheduledStartAt: new Date(meeting_info.start_time * 1000),
      scheduledEndAt: new Date(meeting_info.end_time * 1000),
    };

    if (event === 'meeting.started')
      meetingData.startAt = new Date(operate_time);
    if (event === 'meeting.end') meetingData.endAt = new Date(operate_time);

    if (event === 'recording.completed') {
      // Recording state is now managed on the Minute model instead of Meeting.
    }

    const subMeetingId =
      (meeting_info as MeetingSessionInfo).sub_meeting_id || '__ROOT__';

    return await this.meetingRepo.upsert(
      Platform.TENCENT_MEETING,
      meeting_info.meeting_id,
      subMeetingId,
      meetingData as MeetingData,
    );
  }

  // ==========================================
  // 从 API 数据中拉取处理会议入库
  // ==========================================
  async upsertMeetingFromApiRecord(record: RecordMeeting, operatorId: string) {
    const detail = await this.tencentApi.getMeetingDetail(
      record.meeting_id,
      operatorId,
    );
    const meetingInfo = detail.meeting_info_list?.[0];

    const meetingType = meetingInfo?.meeting_type;
    const isRecurring = meetingType === TENCENT_MEETING_TYPE_RECURRING;
    const subMeetingId =
      isRecurring && meetingInfo
        ? computeSubMeetingId(record.media_start_time, meetingInfo.start_time)
        : '__ROOT__';

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
      Platform.TENCENT_MEETING,
      record.meeting_id,
      subMeetingId,
      {
        title: meetingInfo?.subject ?? record.subject,
        meetingCode: meetingInfo?.meeting_code ?? record.meeting_code,
        type: systemMeetingType,
        scheduledStartAt,
        timezone,
        scheduledEndAt,
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

  // ==========================================
  // 创建或更新平台用户
  // ==========================================
  async upsertPtUser(user: Meetuser): Promise<PlatformUser> {
    if (!user.uuid) {
      throw new Error(
        `User UUID is required but not provided for user ${user.user_name || 'unknown'}`,
      );
    }
    try {
      return await this.ptUserRepo.upsert(
        {
          platform: Platform.TENCENT_MEETING,
          ptUnionId: user.uuid,
        },
        {
          ptUserId: user.userid,
          displayName: user.user_name,
          platformData: {
            instance_id: user.instance_id,
            ms_open_id: user.ms_open_id,
          },
        },
      );
    } catch (error) {
      throw new Error(
        `Failed to upsert platform user for user ${user.uuid}: ${(error as Error).message}`,
      );
    }
  }

  // ==========================================
  // 从 Webhook 录制数据入库
  // ==========================================
  async upsertRecordingFromWebhook(
    meeting: Meeting,
    externalId: string,
  ): Promise<Minute> {
    return await this.recordingRepo.upsert({
      meetingId: meeting.id,
      externalId,
      source: RecordingSource.PLATFORM_AUTO,
      status: RecordingStatus.COMPLETED,
      startAt: meeting.startAt || undefined,
      endAt: meeting.endAt || undefined,
    });
  }

  // ==========================================
  // 从 API 录制文件数据入库
  // ==========================================
  async upsertRecordingFromApiFile(
    meetingId: string,
    file: RecordFile,
    state: number,
  ): Promise<Minute> {
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
