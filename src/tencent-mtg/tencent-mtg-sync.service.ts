import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories/meeting-recording.repository';
import { MeetingPlatform, RecordingSource } from '@prisma/client';
import type {
  RecordMeeting,
  RecordFile,
  ParticipantDetail,
} from '@/integrations/tencent-meeting/types';
import {
  TENCENT_MEETING_TYPE_RECURRING,
  computeSubMeetingId,
  mergeDateTime,
  convertMeetingType,
  mapRecordingState,
  mapRecordingFileStatus,
} from './tencent-mtg-record.mapper';
import { TranscriptRepository } from '@/meeting/repositories/transcript.repository';
import { TranscriptBatchProcessor } from '@/tencent-mtg-hook/services/transcript-batch-processor.service';
import { ParticipantService } from '@/integrations/tencent-meeting/services';
import { SpeakerService } from '@/tencent-mtg-hook/services/speaker.service';
import { NewTranscriptParagraph } from '@/tencent-mtg-hook/types/recording-transcript.types';

@Injectable()
export class TencentMtgSyncService {
  private readonly logger = new Logger(TencentMtgSyncService.name);

  constructor(
    @InjectQueue('tencent-mtg-sync') private readonly syncQueue: Queue,
    private readonly tencentApi: TencentApiService,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly transcriptBatchProcessor: TranscriptBatchProcessor,
    private readonly participantSvc: ParticipantService,
    private readonly speakerSvc: SpeakerService,
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) {}

  /**
   * 触发同步，切分时间区间并投递到队列
   * @param startTime - 起始时间戳（Unix 秒），默认 7 天前
   * @param endTime - 结束时间戳（Unix 秒），默认当前时间
   * @returns 成功投递的 job IDs
   */
  async syncRecordings(
    startTime?: number,
    endTime?: number,
    operatorId?: string,
  ): Promise<{ jobIds: string[]; message: string }> {
    const now = Math.floor(Date.now() / 1000);
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? effectiveEndTime - 7 * 24 * 60 * 60;

    const CHUNK_SIZE_SEC = 30 * 24 * 60 * 60; // 30 天的秒数
    const jobIds: string[] = [];

    this.logger.log(
      `Enqueueing sync jobs: ${new Date(effectiveStartTime * 1000).toISOString()} ~ ${new Date(effectiveEndTime * 1000).toISOString()}`,
    );

    let currentStart = effectiveStartTime;
    while (currentStart < effectiveEndTime) {
      const currentEnd = Math.min(
        currentStart + CHUNK_SIZE_SEC,
        effectiveEndTime,
      );

      const job = await this.syncQueue.add('sync-chunk', {
        startTime: currentStart,
        endTime: currentEnd,
        operatorId,
      });

      if (job.id) {
        jobIds.push(job.id);
      }

      currentStart = currentEnd; // move to next chunk
    }

    this.logger.log(`Enqueued ${jobIds.length} jobs for Tencent Meeting sync.`);

    return {
      message: `Successfully enqueued ${jobIds.length} sync jobs.`,
      jobIds,
    };
  }

  /**
   * 获取录制记录列表并逐条 upsert
   */
  async syncRecords(
    startTime: number,
    endTime: number,
    operatorId?: string,
  ): Promise<{
    meetingsUpserted: number;
    recordingsUpserted: number;
    errors: string[];
  }> {
    const effectiveOperatorId = operatorId || this.config.api.userId;
    const recordMeetings = await this.tencentApi.getAllCorpRecords(
      startTime,
      endTime,
      effectiveOperatorId,
      1,
    );

    let meetingsUpserted = 0;
    let recordingsUpserted = 0;
    const errors: string[] = [];

    for (const record of recordMeetings) {
      try {
        const meeting = await this.upsertMeetingFromRecord(
          record,
          effectiveOperatorId,
        );
        meetingsUpserted++;

        if (record.record_files?.length) {
          for (const file of record.record_files) {
            try {
              const recording = await this.upsertRecordingFromFile(
                meeting.id,
                file,
                record.state,
              );

              if (record.state === 3) {
                try {
                  const startTime = meeting.scheduledStartAt
                    ? Math.floor(meeting.scheduledStartAt.getTime() / 1000)
                    : undefined;
                  const endTime = meeting.scheduledEndAt
                    ? Math.floor(meeting.scheduledEndAt.getTime() / 1000)
                    : undefined;

                  await this.upsertTranscriptFromFile(
                    record.meeting_id,
                    meeting.subMeetingId || '__ROOT__',
                    recording.id,
                    file.record_file_id,
                    effectiveOperatorId,
                    startTime,
                    endTime,
                  );
                } catch (transcriptError) {
                  const msg = `Failed to upsert transcript for file ${file.record_file_id}: ${(transcriptError as Error).message}`;
                  this.logger.warn(msg);
                  errors.push(msg);
                }
              }

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

    return { meetingsUpserted, recordingsUpserted, errors };
  }

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

  async upsertTranscriptFromFile(
    meetid: string,
    subid: string,
    recordingId: string,
    recordFileId: string,
    operatorId: string,
    startTime?: number,
    endTime?: number,
  ) {
    const existingTranscript =
      await this.transcriptRepo.findByRecordingId(recordingId);

    if (existingTranscript) {
      return; // Already processed
    }

    const transcript = await this.transcriptRepo.create({
      source: `tencent-meeting:${recordFileId}`,
      status: 2,
      recordingId,
    });

    // 获取参会者列表，用于后续丰富说话人信息
    let deduplicated: ParticipantDetail[] = [];
    try {
      const actualSubid = subid === '__ROOT__' ? undefined : subid;
      const participantResult = await this.participantSvc.list(
        meetid,
        operatorId,
        actualSubid,
        startTime,
        endTime,
      );
      deduplicated = participantResult.deduplicated || [];
      if (deduplicated.length > 0) {
        await this.speakerSvc.syncPtUsers(deduplicated);
      }
    } catch (e) {
      this.logger.warn(
        `Failed to fetch participants for meeting ${meetid}: ${e}`,
      );
    }

    const allParagraphs: NewTranscriptParagraph[] = [];

    const res = await this.tencentApi.getTranscript(
      recordFileId,
      operatorId,
      1,
    );

    if (res.minutes?.paragraphs) {
      // 使用 SpeakerService 匹配并丰富说话人信息
      const mappedParagraphs = await Promise.all(
        res.minutes.paragraphs.map(async (p) => ({
          ...p,
          speaker_info:
            deduplicated.length > 0
              ? await this.speakerSvc.enrichSpeakerInfo(
                  p.speaker_info,
                  deduplicated,
                )
              : {
                  ...p.speaker_info,
                  uuid: p.speaker_info.openId || p.speaker_info.userid,
                },
        })),
      );
      allParagraphs.push(...mappedParagraphs);
    }

    if (allParagraphs.length > 0) {
      await this.transcriptBatchProcessor.processParagraphsInBatches(
        allParagraphs,
        transcript.id,
      );
    }
  }
}
