import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories/meeting-recording.repository';
import {
  MeetingPlatform,
  MeetingType,
  Meeting,
  RecordingSource,
  RecordingStatus,
  ProcessingStatus,
} from '@prisma/client';
import type {
  RecordMeeting,
  RecordFile,
} from '@/integrations/tencent-meeting/types';

/** 腾讯会议 meeting_type 枚举值 */
const TENCENT_MEETING_TYPE_RECURRING = 1;

/**
 * 腾讯会议录制同步服务
 * 从腾讯会议 API 获取账户级录制列表，并通过 upsert 补充本地数据库
 */
@Injectable()
export class TencentMtgSyncService {
  private readonly logger = new Logger(TencentMtgSyncService.name);

  constructor(
    private readonly tencentApi: TencentApiService,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) {}

  /**
   * 同步指定时间范围内的腾讯会议录制列表
   * @param startTime - 起始时间戳（Unix 秒），默认 7 天前
   * @param endTime - 结束时间戳（Unix 秒），默认当前时间
   * @returns 同步统计结果
   */
  async syncRecordings(
    startTime?: number,
    endTime?: number,
  ): Promise<{
    meetingsUpserted: number;
    recordingsUpserted: number;
    errors: string[];
  }> {
    const now = Math.floor(Date.now() / 1000);
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? effectiveEndTime - 7 * 24 * 60 * 60;

    this.logger.log(
      `Starting recording sync: ${new Date(effectiveStartTime * 1000).toISOString()} ~ ${new Date(effectiveEndTime * 1000).toISOString()}`,
    );

    const operatorId = this.config.api.userId;
    const recordMeetings = await this.tencentApi.getAllCorpRecords(
      effectiveStartTime,
      effectiveEndTime,
      operatorId,
      1,
    );

    this.logger.log(
      `Fetched ${recordMeetings.length} meeting records from Tencent API`,
    );

    let meetingsUpserted = 0;
    let recordingsUpserted = 0;
    const errors: string[] = [];

    for (const record of recordMeetings) {
      try {
        const meeting = await this.upsertMeetingFromRecord(record, operatorId);
        meetingsUpserted++;

        if (record.record_files?.length) {
          for (const file of record.record_files) {
            try {
              await this.upsertRecordingFromFile(
                meeting.id,
                file,
                record.state,
              );
              recordingsUpserted++;
            } catch (fileError) {
              const msg = `Failed to upsert recording file ${file.record_file_id}: ${(fileError as Error).message}`;
              this.logger.warn(msg);
              errors.push(msg);
            }
          }
        }
      } catch (meetingError) {
        const msg = `Failed to upsert meeting ${record.meeting_id}: ${(meetingError as Error).message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    this.logger.log(
      `Sync completed: ${meetingsUpserted} meetings, ${recordingsUpserted} recordings upserted, ${errors.length} errors`,
    );

    return { meetingsUpserted, recordingsUpserted, errors };
  }

  /**
   * 根据腾讯会议录制记录 upsert Meeting
   * 先通过 getMeetingDetail 查询会议详情，再根据详情 upsert
   */
  private async upsertMeetingFromRecord(
    record: RecordMeeting,
    operatorId: string,
  ): Promise<Meeting> {
    // 1. 通过 getMeetingDetail 查询会议详情
    const detail = await this.tencentApi.getMeetingDetail(
      record.meeting_id,
      undefined,
      1,
      operatorId,
      1,
    );

    const meetingInfo = detail.meeting_info_list?.[0];

    // 2. 确定 meeting_type 和 subMeetingId
    const meetingType = meetingInfo?.meeting_type;
    const isRecurring = meetingType === TENCENT_MEETING_TYPE_RECURRING;
    const subMeetingId =
      isRecurring && meetingInfo
        ? this.computeSubMeetingId(
            record.media_start_time,
            meetingInfo.start_time,
          )
        : '__ROOT__';

    // 3. 从详情中提取丰富的会议信息
    const hasRecording =
      record.state === 3 && (record.record_files?.length ?? 0) > 0;
    const recordingStatus = this.mapRecordingState(record.state);
    const systemMeetingType = this.convertMeetingType(meetingType);

    const scheduledStartAt = meetingInfo?.start_time
      ? new Date(Number(meetingInfo.start_time) * 1000)
      : undefined;
    const scheduledEndAt = meetingInfo?.end_time
      ? new Date(Number(meetingInfo.end_time) * 1000)
      : undefined;

    this.logger.debug(
      `Upserting meeting ${record.meeting_id} (subMeetingId=${subMeetingId}, type=${meetingType}, isRecurring=${isRecurring})`,
    );

    return this.meetingRepo.upsert(
      MeetingPlatform.TENCENT_MEETING,
      record.meeting_id,
      subMeetingId,
      {
        title: meetingInfo?.subject ?? record.subject,
        meetingCode: meetingInfo?.meeting_code ?? record.meeting_code,
        type: systemMeetingType,
        startAt: new Date(record.media_start_time),
        scheduledStartAt,
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
   * 计算周期性会议的 subMeetingId
   *
   * 逻辑：
   * - 从 media_start_time（毫秒）截取精确到日的日期部分（年-月-日）
   * - 从查询会议接口返回的 start_time（秒）提取具体的时间部分（时:分:秒）
   * - 将两者组合为一个完整的时间戳（Unix 秒），作为 subMeetingId
   *
   * @param mediaStartTimeMs - 录制开始时间（毫秒时间戳）
   * @param meetingStartTimeSec - 会议预定开始时间（秒时间戳字符串）
   * @returns 组合后的时间戳字符串作为 subMeetingId
   */
  private computeSubMeetingId(
    mediaStartTimeMs: number,
    meetingStartTimeSec: string,
  ): string {
    // 从 media_start_time 提取日期部分（UTC）
    const mediaDate = new Date(mediaStartTimeMs);
    const year = mediaDate.getUTCFullYear();
    const month = mediaDate.getUTCMonth();
    const day = mediaDate.getUTCDate();

    // 从 meeting detail 的 start_time 提取时间部分（UTC）
    const meetingDate = new Date(Number(meetingStartTimeSec) * 1000);
    const hours = meetingDate.getUTCHours();
    const minutes = meetingDate.getUTCMinutes();
    const seconds = meetingDate.getUTCSeconds();

    // 组合日期 + 时间
    const combined = new Date(
      Date.UTC(year, month, day, hours, minutes, seconds),
    );
    const combinedTimestampSec = Math.floor(combined.getTime() / 1000);

    return String(combinedTimestampSec);
  }

  /**
   * 根据录制文件信息 upsert MeetingRecording
   */
  private async upsertRecordingFromFile(
    meetingId: string,
    file: RecordFile,
    state: number,
  ) {
    return this.recordingRepo.upsert({
      meetingId,
      externalId: file.record_file_id,
      source: RecordingSource.PLATFORM_AUTO,
      status: this.mapRecordingFileStatus(state),
      startAt: new Date(file.record_start_time),
      endAt: new Date(file.record_end_time),
    });
  }

  /**
   * 将腾讯会议 meeting_type 转换为系统 MeetingType
   * 0=一次性 → ONE_TIME, 1=周期性 → RECURRING, 5=个人会议号 → SCHEDULED, 其他 → SCHEDULED
   */
  private convertMeetingType(meetingType?: number): MeetingType {
    switch (meetingType) {
      case 0:
        return MeetingType.ONE_TIME;
      case 1:
        return MeetingType.RECURRING;
      case 2: // 微信专属会议
      case 4: // Rooms 投屏会议
        return MeetingType.INSTANT;
      case 5: // 个人会议号会议
        return MeetingType.SCHEDULED;
      default:
        return MeetingType.SCHEDULED;
    }
  }

  /**
   * 将腾讯会议录制 state 映射到 ProcessingStatus
   * 1=录制中 → PROCESSING, 2=转码中 → PROCESSING, 3=转码完成 → COMPLETED
   */
  private mapRecordingState(state: number): ProcessingStatus {
    switch (state) {
      case 1:
        return ProcessingStatus.PROCESSING;
      case 2:
        return ProcessingStatus.PROCESSING;
      case 3:
        return ProcessingStatus.COMPLETED;
      default:
        return ProcessingStatus.PENDING;
    }
  }

  /**
   * 将腾讯会议录制 state 映射到 RecordingStatus
   * 1=录制中 → RECORDING, 2=转码中 → PROCESSING, 3=转码完成 → COMPLETED
   */
  private mapRecordingFileStatus(state: number): RecordingStatus {
    switch (state) {
      case 1:
        return RecordingStatus.RECORDING;
      case 2:
        return RecordingStatus.PROCESSING;
      case 3:
        return RecordingStatus.COMPLETED;
      default:
        return RecordingStatus.RECORDING;
    }
  }
}
