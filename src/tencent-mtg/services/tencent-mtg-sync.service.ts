import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { Meeting } from '@prisma/client';
import type {
  RecordMeeting,
  RecordFile,
} from '@/integrations/tencent-meeting/types';
import { TencentMtgMeetingCoreService } from './tencent-mtg-meeting-core.service';
import { TencentMtgTranscriptCoreService } from './tencent-mtg-transcript-core.service';
import { TencentMtgSummaryCoreService } from './tencent-mtg-summary-core.service';

@Injectable()
export class TencentMtgSyncService {
  private readonly logger = new Logger(TencentMtgSyncService.name);

  constructor(
    @InjectQueue('tencent-mtg-sync') private readonly syncQueue: Queue,
    private readonly tencentApi: TencentApiService,
    private readonly meetingCoreService: TencentMtgMeetingCoreService,
    private readonly transcriptCoreService: TencentMtgTranscriptCoreService,
    private readonly summaryCoreService: TencentMtgSummaryCoreService,
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
    forceReSyncTranscript: boolean = false,
    syncTranscripts: boolean = true,
    syncSummaries: boolean = true,
    syncParticipants: boolean = true,
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
        forceReSyncTranscript,
        syncTranscripts,
        syncSummaries,
        syncParticipants,
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
    forceReSyncTranscript: boolean = false,
    syncTranscripts: boolean = true,
    syncSummaries: boolean = true,
    syncParticipants: boolean = true,
  ): Promise<number> {
    try {
      // Step 2.2: 同步录制文件信息
      const recording =
        await this.meetingCoreService.upsertRecordingFromApiFile(
          meeting.id,
          file,
          record.state,
        );

      const startTime = meeting.scheduledStartAt
        ? Math.floor(meeting.scheduledStartAt.getTime() / 1000)
        : undefined;
      const endTime = meeting.scheduledEndAt
        ? Math.floor(meeting.scheduledEndAt.getTime() / 1000)
        : undefined;
      const subMeetingId = meeting.subMeetingId || '__ROOT__';

      // 如果需要同步参会者，但转写不需要同步，则独立触发参会者同步
      if (syncParticipants && !syncTranscripts) {
        await this.transcriptCoreService.syncParticipantsForTranscript(
          record.meeting_id,
          subMeetingId,
          operatorId,
          startTime,
          endTime,
          true,
        );
      }

      // 状态 3 表示录制已完成，只有录制完成才有转写记录可以拉取
      if (record.state === 3) {
        if (syncTranscripts) {
          try {
            // Step 2.3: 同步转写文本及其相关参会人信息
            await this.transcriptCoreService.syncFromApi(
              record.meeting_id,
              subMeetingId,
              recording.id,
              file.record_file_id,
              operatorId,
              startTime,
              endTime,
              forceReSyncTranscript,
              syncParticipants,
            );
          } catch (transcriptError) {
            this.handleSyncError(
              errors,
              `upsert transcript for file ${file.record_file_id}`,
              transcriptError,
            );
          }
        }

        if (syncSummaries) {
          try {
            // Step 2.4: 同步录制文件的智能摘要、纪要和待办
            await this.summaryCoreService.upsertSummaryFromApi(
              meeting.id,
              recording.id,
              file.record_file_id,
              operatorId,
            );
          } catch (summaryError) {
            this.handleSyncError(
              errors,
              `upsert summary for file ${file.record_file_id}`,
              summaryError,
            );
          }
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
    forceReSyncTranscript: boolean = false,
    syncTranscripts: boolean = true,
    syncSummaries: boolean = true,
    syncParticipants: boolean = true,
  ): Promise<{ meetingsUpserted: number; recordingsUpserted: number }> {
    try {
      // Step 2.1: 同步会议基本信息
      const meeting = await this.meetingCoreService.upsertMeetingFromApiRecord(
        record,
        operatorId,
      );
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
            forceReSyncTranscript,
            syncTranscripts,
            syncSummaries,
            syncParticipants,
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
    forceReSyncTranscript: boolean = false,
    syncTranscripts: boolean = true,
    syncSummaries: boolean = true,
    syncParticipants: boolean = true,
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
        await this.processMeetingRecord(
          record,
          effectiveOperatorId,
          errors,
          forceReSyncTranscript,
          syncTranscripts,
          syncSummaries,
          syncParticipants,
        );

      totalMeetingsUpserted += meetingsUpserted;
      totalRecordingsUpserted += recordingsUpserted;
    }

    return {
      meetingsUpserted: totalMeetingsUpserted,
      recordingsUpserted: totalRecordingsUpserted,
      errors,
    };
  }
}
