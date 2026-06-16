import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
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

const TENCENT_MEETING_TYPE_RECURRING = 1;

interface SyncJobData {
  startTime: number;
  endTime: number;
}

@Processor('tencent-mtg-sync', {
  concurrency: 1,
  limiter: {
    max: 5,
    duration: 60000,
  },
})
export class TencentMtgSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(TencentMtgSyncProcessor.name);

  constructor(
    private readonly tencentApi: TencentApiService,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) {
    super();
  }

  async process(job: Job<SyncJobData>) {
    const { startTime, endTime } = job.data;
    
    this.logger.log(`Processing job ${job.id}: Syncing ${new Date(startTime * 1000).toISOString()} ~ ${new Date(endTime * 1000).toISOString()}`);

    const operatorId = this.config.api.userId;
    const recordMeetings = await this.tencentApi.getAllCorpRecords(
      startTime,
      endTime,
      operatorId,
      1,
    );

    this.logger.log(`Job ${job.id}: Fetched ${recordMeetings.length} meeting records`);

    let meetingsUpserted = 0;
    let recordingsUpserted = 0;
    const errors: string[] = [];

    let processedCount = 0;

    for (const record of recordMeetings) {
      try {
        const meeting = await this.upsertMeetingFromRecord(record, operatorId);
        meetingsUpserted++;

        if (record.record_files?.length) {
          for (const file of record.record_files) {
            try {
              await this.upsertRecordingFromFile(meeting.id, file, record.state);
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

      processedCount++;
      const progress = Math.floor((processedCount / recordMeetings.length) * 100);
      await job.updateProgress(progress);
    }

    this.logger.log(`Job ${job.id} completed: ${meetingsUpserted} meetings, ${recordingsUpserted} recordings upserted, ${errors.length} errors`);

    return {
      meetingsUpserted,
      recordingsUpserted,
      errors,
    };
  }

  private async upsertMeetingFromRecord(
    record: RecordMeeting,
    operatorId: string,
  ): Promise<Meeting> {
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
        ? this.computeSubMeetingId(record.media_start_time, meetingInfo.start_time)
        : '__ROOT__';

    const hasRecording = record.state === 3 && (record.record_files?.length ?? 0) > 0;
    const recordingStatus = this.mapRecordingState(record.state);
    const systemMeetingType = this.convertMeetingType(meetingType);

    const scheduledStartAt = isRecurring
      ? this.combineMediaDateWithMeetingTime(
          record.media_start_time,
          meetingInfo?.start_time,
        )
      : meetingInfo?.start_time
        ? new Date(Number(meetingInfo.start_time) * 1000)
        : undefined;
    const scheduledEndAt = isRecurring
      ? this.combineMediaDateWithMeetingTime(
          record.media_start_time,
          meetingInfo?.end_time,
        )
      : meetingInfo?.end_time
        ? new Date(Number(meetingInfo.end_time) * 1000)
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

  private computeSubMeetingId(
    mediaStartTimeMs: number,
    meetingStartTimeSec: string,
  ): string {
    const mediaDate = new Date(mediaStartTimeMs);
    const year = mediaDate.getUTCFullYear();
    const month = mediaDate.getUTCMonth();
    const day = mediaDate.getUTCDate();

    const meetingDate = new Date(Number(meetingStartTimeSec) * 1000);
    const hours = meetingDate.getUTCHours();
    const minutes = meetingDate.getUTCMinutes();
    const seconds = meetingDate.getUTCSeconds();

    const combined = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return String(Math.floor(combined.getTime() / 1000));
  }

  private combineMediaDateWithMeetingTime(
    mediaStartTimeMs: number,
    meetingTimeSec: string | undefined,
  ): Date | undefined {
    if (!meetingTimeSec) return undefined;

    const mediaDate = new Date(mediaStartTimeMs);
    const year = mediaDate.getUTCFullYear();
    const month = mediaDate.getUTCMonth();
    const day = mediaDate.getUTCDate();

    const meetingDate = new Date(Number(meetingTimeSec) * 1000);
    const hours = meetingDate.getUTCHours();
    const minutes = meetingDate.getUTCMinutes();
    const seconds = meetingDate.getUTCSeconds();

    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

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

  private convertMeetingType(meetingType?: number): MeetingType {
    switch (meetingType) {
      case 0: return MeetingType.ONE_TIME;
      case 1: return MeetingType.RECURRING;
      case 2:
      case 4: return MeetingType.INSTANT;
      case 5: return MeetingType.SCHEDULED;
      default: return MeetingType.SCHEDULED;
    }
  }

  private mapRecordingState(state: number): ProcessingStatus {
    switch (state) {
      case 1:
      case 2: return ProcessingStatus.PROCESSING;
      case 3: return ProcessingStatus.COMPLETED;
      default: return ProcessingStatus.PENDING;
    }
  }

  private mapRecordingFileStatus(state: number): RecordingStatus {
    switch (state) {
      case 1: return RecordingStatus.RECORDING;
      case 2: return RecordingStatus.PROCESSING;
      case 3: return RecordingStatus.COMPLETED;
      default: return RecordingStatus.RECORDING;
    }
  }
}
