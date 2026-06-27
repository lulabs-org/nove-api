import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories/meeting-recording.repository';
import { MeetingPlatform, RecordingSource, Meeting } from '@prisma/client';
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
import { TranscriptSyncService } from '@/tencent-mtg-hook/services/transcript-sync.service';
import { ParticipantService } from '@/integrations/tencent-meeting/services';
import { SpeakerService } from '@/tencent-mtg-hook/services/speaker.service';
import { NewTranscriptParagraph } from '@/tencent-mtg-hook/types/transcript.types';

@Injectable()
export class TencentMtgSyncService {
  private readonly logger = new Logger(TencentMtgSyncService.name);

  constructor(
    @InjectQueue('tencent-mtg-sync') private readonly syncQueue: Queue,
    private readonly tencentApi: TencentApiService,
    private readonly meetingRepo: MeetingRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly transcriptSyncService: TranscriptSyncService,
    private readonly participantSvc: ParticipantService,
    private readonly speakerSvc: SpeakerService,
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) { }

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
    const effectiveEndTime = Math.min(endTime ?? now, now);
    const effectiveStartTime = Math.min(
      startTime ?? effectiveEndTime - 7 * 24 * 60 * 60,
      effectiveEndTime,
    );

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
   * 统一处理同步错误记录
   */
  private handleSyncError(errors: string[], context: string, error: unknown) {
    const msg = `Failed to ${context}: ${error instanceof Error ? error.message : String(error)}`;
    this.logger.warn(msg);
    errors.push(msg);
  }

  /**
   * 处理单个录制文件的同步
   */
  private async processRecordingFile(
    file: RecordFile,
    record: RecordMeeting,
    meeting: Meeting,
    operatorId: string,
    errors: string[],
  ): Promise<number> {
    try {
      // Step 2.2: 同步录制文件信息
      const recording = await this.upsertRecordingFromFile(
        meeting.id,
        file,
        record.state,
      );

      // 状态 3 表示录制已完成，只有录制完成才有转写记录可以拉取
      if (record.state === 3) {
        try {
          const startTime = meeting.scheduledStartAt
            ? Math.floor(meeting.scheduledStartAt.getTime() / 1000)
            : undefined;
          const endTime = meeting.scheduledEndAt
            ? Math.floor(meeting.scheduledEndAt.getTime() / 1000)
            : undefined;

          // Step 2.3: 同步转写文本及其相关参会人信息
          await this.upsertTranscriptFromFile(
            record.meeting_id,
            meeting.subMeetingId || '__ROOT__',
            recording.id,
            file.record_file_id,
            operatorId,
            startTime,
            endTime,
          );
        } catch (transcriptError) {
          this.handleSyncError(
            errors,
            `upsert transcript for file ${file.record_file_id}`,
            transcriptError,
          );
        }
      }
      return 1;
    } catch (fileError) {
      this.handleSyncError(
        errors,
        `upsert recording file ${file.record_file_id}`,
        fileError,
      );
      return 0;
    }
  }

  /**
   * 处理单条企业录制记录的同步
   */
  private async processMeetingRecord(
    record: RecordMeeting,
    operatorId: string,
    errors: string[],
  ): Promise<{ meetingsUpserted: number; recordingsUpserted: number }> {
    try {
      // Step 2.1: 同步会议基本信息
      const meeting = await this.upsertMeetingFromRecord(record, operatorId);
      let recordingsUpserted = 0;

      if (record.record_files?.length) {
        // 遍历并同步该会议的所有录制文件
        for (const file of record.record_files) {
          recordingsUpserted += await this.processRecordingFile(
            file,
            record,
            meeting,
            operatorId,
            errors,
          );
        }
      }

      return { meetingsUpserted: 1, recordingsUpserted };
    } catch (meetingError) {
      this.handleSyncError(
        errors,
        `upsert meeting ${record.meeting_id}`,
        meetingError,
      );
      return { meetingsUpserted: 0, recordingsUpserted: 0 };
    }
  }

  /**
   * 获取企业录制列表并逐条同步到本地数据库。
   * 这个方法通常由队列 Worker 在后台执行，处理特定时间块的数据同步。
   * 包含：会议信息同步、录制文件信息同步、转写记录同步。
   * @param startTime - 起始时间戳（Unix 秒）
   * @param endTime - 结束时间戳（Unix 秒）
   * @param operatorId - 操作者ID，如果未指定则使用配置的默认 userId
   * @returns 同步结果统计，包括 upsert 的会议数、录制文件数以及过程中发生的错误
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
    const now = Math.floor(Date.now() / 1000);
    if (startTime >= now) {
      this.logger.warn(
        `Skip syncRecords: startTime (${startTime}) is in the future.`,
      );
      return { meetingsUpserted: 0, recordingsUpserted: 0, errors: [] };
    }

    const actualEndTime = Math.min(endTime, now);
    const effectiveOperatorId = operatorId || this.config.api.userId;

    // 1. 获取指定时间段内的所有企业录制记录
    const recordMeetings = await this.tencentApi.getAllCorpRecords(
      startTime,
      actualEndTime,
      effectiveOperatorId,
      1,
    );

    let totalMeetingsUpserted = 0;
    let totalRecordingsUpserted = 0;
    const errors: string[] = [];

    for (const record of recordMeetings) {
      const { meetingsUpserted, recordingsUpserted } =
        await this.processMeetingRecord(record, effectiveOperatorId, errors);

      totalMeetingsUpserted += meetingsUpserted;
      totalRecordingsUpserted += recordingsUpserted;
    }

    return {
      meetingsUpserted: totalMeetingsUpserted,
      recordingsUpserted: totalRecordingsUpserted,
      errors,
    };
  }

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

  /**
   * 获取并同步录制文件的转写记录（包含发言人识别）。
   * 流程：
   * 1. 检查是否已处理过该转写记录。
   * 2. 拉取会议参会者列表并同步，用于后续关联匹配说话人身份。
   * 3. 拉取转写段落数据，使用参会者信息丰富各个段落里的 speaker_info。
   * 4. 批量插入处理好的转写段落到数据库中。
   */
  async upsertTranscriptFromFile(
    meetid: string,
    subid: string,
    recordingId: string,
    recordFileId: string,
    operatorId: string,
    startTime?: number,
    endTime?: number,
  ) {
    let transcriptId: string | undefined;

    const existingTranscript =
      await this.transcriptRepo.findByRecordingId(recordingId);

    if (existingTranscript) {
      const segmentCount = await this.transcriptRepo.countSegments(
        existingTranscript.id,
      );
      if (segmentCount > 0) {
        return; // Already processed and has segments
      }
      transcriptId = existingTranscript.id;
    }

    // 获取参会者列表，用于后续丰富说话人信息
    const deduplicated = await this.syncParticipantsForTranscript(
      meetid,
      subid,
      operatorId,
      startTime,
      endTime,
    );

    // 拉取所有转写段落数据
    const allParagraphs = await this.fetchTranscriptParagraphs(
      recordFileId,
      operatorId,
      deduplicated,
    );

    // 如果有段落，则处理并存入数据库
    if (allParagraphs.length > 0) {
      if (!transcriptId) {
        const transcript = await this.transcriptRepo.create({
          source: `tencent-meeting:${recordFileId}`,
          status: 2,
          recordingId,
        });
        transcriptId = transcript.id;
      }

      await this.transcriptSyncService.sync(
        allParagraphs,
        transcriptId,
      );
    }
  }

  private async syncParticipantsForTranscript(
    meetid: string,
    subid: string,
    operatorId: string,
    startTime?: number,
    endTime?: number,
  ): Promise<ParticipantDetail[]> {
    try {
      const actualSubid = subid === '__ROOT__' ? undefined : subid;
      const participantResult = await this.participantSvc.list(
        meetid,
        operatorId,
        actualSubid,
        startTime,
        endTime,
      );
      const deduplicated = participantResult.deduplicated || [];
      if (deduplicated.length > 0) {
        await this.speakerSvc.syncPtUsers(deduplicated);
      }
      return deduplicated;
    } catch (e) {
      this.logger.warn(
        `Failed to fetch participants for meeting ${meetid}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return [];
    }
  }

  private async fetchTranscriptParagraphs(
    recordFileId: string,
    operatorId: string,
    deduplicated: ParticipantDetail[],
  ): Promise<NewTranscriptParagraph[]> {
    const allParagraphs: NewTranscriptParagraph[] = [];
    let hasMore = true;
    let currentPid: string | undefined = undefined;

    while (hasMore) {
      try {
        const res = await this.tencentApi.getTranscript(
          recordFileId,
          operatorId,
          1,
          currentPid,
        );

        if (res.minutes?.paragraphs && res.minutes.paragraphs.length > 0) {
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
                  : p.speaker_info,
            })),
          );
          allParagraphs.push(...mappedParagraphs);

          // 获取下一页的 pid
          const lastParagraph =
            res.minutes.paragraphs[res.minutes.paragraphs.length - 1];
          currentPid = lastParagraph.pid;
        }

        hasMore = res.more === true;
      } catch (err) {
        this.logger.warn(
          `Failed to fetch transcript page for recording ${recordFileId} (pid: ${currentPid}): ${err instanceof Error ? err.message : String(err)}`,
        );
        break; // Stop fetching on error
      }
    }

    return allParagraphs;
  }
}
