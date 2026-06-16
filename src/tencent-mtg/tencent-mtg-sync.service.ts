import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories/meeting-recording.repository';
import {
  MeetingPlatform,
  RecordingSource,
  RecordingStatus,
  ProcessingStatus,
} from '@prisma/client';
import type {
  RecordMeeting,
  RecordFile,
} from '@/integrations/tencent-meeting/types';

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
        await this.upsertMeetingFromRecord(record);
        meetingsUpserted++;

        if (record.record_files?.length) {
          const meeting = await this.meetingRepo.findByPt(
            MeetingPlatform.TENCENT_MEETING,
            record.meeting_id,
            '__ROOT__',
          );

          if (meeting) {
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
   */
  private async upsertMeetingFromRecord(record: RecordMeeting) {
    const hasRecording =
      record.state === 3 && (record.record_files?.length ?? 0) > 0;

    const recordingStatus = this.mapRecordingState(record.state);

    return this.meetingRepo.upsert(
      MeetingPlatform.TENCENT_MEETING,
      record.meeting_id,
      '__ROOT__',
      {
        title: record.subject,
        meetingCode: record.meeting_code,
        startAt: new Date(record.media_start_time),
        hasRecording,
        recordingStatus,
        metadata: {
          meeting_record_id: record.meeting_record_id,
          userid: record.userid,
          record_type: record.record_type,
        },
      },
    );
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
