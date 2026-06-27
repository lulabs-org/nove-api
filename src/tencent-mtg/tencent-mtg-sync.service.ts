import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
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
import { MeetingParticipantService } from '@/tencent-mtg-hook/services/meeting-participant.service';
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
    private readonly transcriptBatchProcessor: TranscriptBatchProcessor,
    private readonly participantSvc: ParticipantService,
    private readonly speakerSvc: SpeakerService,
    private readonly meetingParticipantSvc: MeetingParticipantService,
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) {}

  /**
   * 触发同步，切分时间区间并投递到队列
   * @param startTime - 起始时间戳（Unix 秒），默认 7 天前
   * @param endTime - 结束时间戳（Unix 秒），默认当前时间
   * @param operatorId - 操作者ID
   * @param syncTranscripts - 是否同步转写记录，默认为 true
   * @returns 成功投递的 job IDs
   */
  async syncRecordings(
    startTime?: number,
    endTime?: number,
    operatorId?: string,
    syncTranscripts: boolean = true,
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
        syncTranscripts,
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
   * 获取企业录制列表并逐条同步到本地数据库。
   * 这个方法通常由队列 Worker 在后台执行，处理特定时间块的数据同步。
   * 包含：会议信息同步、录制文件信息同步、转写记录同步。
   * @param startTime - 起始时间戳（Unix 秒）
   * @param endTime - 结束时间戳（Unix 秒）
   * @param operatorId - 操作者ID，如果未指定则使用配置的默认 userId
   * @param job - 可选的 BullMQ Job 实例，用于记录进度和日志
   * @returns 同步结果统计，包括 upsert 的会议数、录制文件数以及过程中发生的错误
   */
  async syncRecords(
    startTime: number,
    endTime: number,
    operatorId?: string,
    job?: Job,
    syncTranscripts?: boolean,
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
      if (job) {
        await job.log(
          `[WARNING] Skip syncRecords: startTime (${startTime}) is in the future.`,
        );
      }
      return { meetingsUpserted: 0, recordingsUpserted: 0, errors: [] };
    }

    const actualEndTime = Math.min(endTime, now);
    const effectiveOperatorId = operatorId || this.config.api.userId;

    if (job) {
      await job.log(
        `Fetching records from Tencent API for period: ${new Date(
          startTime * 1000,
        ).toISOString()} ~ ${new Date(actualEndTime * 1000).toISOString()}`,
      );
    }

    // 1. 获取指定时间段内的所有企业录制记录
    const recordMeetings = await this.tencentApi.getAllCorpRecords(
      startTime,
      actualEndTime,
      effectiveOperatorId,
      1,
    );

    if (job) {
      await job.log(
        `Found ${recordMeetings.length} meetings from Tencent API.`,
      );
    }

    let meetingsUpserted = 0;
    let recordingsUpserted = 0;
    const errors: string[] = [];
    const totalMeetings = recordMeetings.length;

    for (let i = 0; i < totalMeetings; i++) {
      const record = recordMeetings[i];
      const logPrefix = `[Meeting ${i + 1}/${totalMeetings}] ID: ${record.meeting_id}`;

      try {
        if (job) {
          await job.log(
            `${logPrefix} Syncing info (Subject: ${record.subject})`,
          );
        }

        // Step 2.1: 同步会议基本信息
        const meeting = await this.upsertMeetingFromRecord(
          record,
          effectiveOperatorId,
        );
        meetingsUpserted++;

        // Step 2.2: 同步参会者信息 (独立于录制文件)
        let deduplicatedParticipants: ParticipantDetail[] = [];
        try {
          if (job) await job.log(`${logPrefix} - Syncing participants...`);
          const actualSubid = meeting.subMeetingId === '__ROOT__' ? undefined : meeting.subMeetingId;
          const participantResult = await this.participantSvc.list(
            record.meeting_id,
            effectiveOperatorId,
            actualSubid,
          );
          deduplicatedParticipants = participantResult.deduplicated || [];
          if (deduplicatedParticipants.length > 0) {
            await this.speakerSvc.syncPtUsers(deduplicatedParticipants);
          }

          if (participantResult.original && participantResult.original.length > 0) {
            await this.meetingParticipantSvc.syncParticipants({
              meetid: record.meeting_id,
              subid: meeting.subMeetingId,
              participants: participantResult.original,
            });
          }
        } catch (e) {
          const msg = `Failed to sync participants for meeting ${record.meeting_id}: ${(e as Error).message}`;
          this.logger.warn(msg);
          if (job) await job.log(`${logPrefix} - [WARNING] ${msg}`);
        }

        if (record.record_files?.length) {
          if (job) {
            await job.log(
              `${logPrefix} Found ${record.record_files.length} recording files.`,
            );
          }

          // 遍历并同步该会议的所有录制文件
          for (const file of record.record_files) {
            try {
              if (job) {
                await job.log(
                  `${logPrefix} - Syncing file ID: ${file.record_file_id}`,
                );
              }

              // Step 2.3: 同步录制文件信息
              const recording = await this.upsertRecordingFromFile(
                meeting.id,
                file,
                record.state,
              );

              // 状态 3 表示录制已完成，只有录制完成才有转写记录可以拉取
              if (record.state === 3 && (syncTranscripts ?? true)) {
                try {
                  if (job) {
                    await job.log(
                      `${logPrefix} - Pulling and syncing transcripts...`,
                    );
                  }
                  // Step 2.4: 同步转写文本及其相关参会人信息
                  await this.upsertTranscriptFromFile(
                    record.meeting_id,
                    meeting.subMeetingId || '__ROOT__',
                    recording.id,
                    file.record_file_id,
                    effectiveOperatorId,
                    deduplicatedParticipants,
                  );

                  if (job) {
                    await job.log(
                      `${logPrefix} - Successfully synced transcripts for file ID: ${file.record_file_id}`,
                    );
                  }
                } catch (transcriptError) {
                  const msg = `Failed to upsert transcript for file ${file.record_file_id}: ${(transcriptError as Error).message}`;
                  this.logger.warn(msg);
                  errors.push(msg);
                  if (job) {
                    await job.log(`${logPrefix} - [WARNING] ${msg}`);
                  }
                }
              } else if (record.state === 3 && !(syncTranscripts ?? true)) {
                if (job) {
                  await job.log(
                    `${logPrefix} - Transcript sync is skipped as syncTranscripts is set to false`,
                  );
                }
              }

              recordingsUpserted++;
            } catch (fileError) {
              const msg = `Failed to upsert recording file ${file.record_file_id}: ${(fileError as Error).message}`;
              this.logger.warn(msg);
              errors.push(msg);
              if (job) {
                await job.log(`${logPrefix} - [WARNING] ${msg}`);
              }
            }
          }
        }
      } catch (meetingError) {
        const msg = `Failed to upsert meeting ${record.meeting_id}: ${(meetingError as Error).message}`;
        this.logger.warn(msg);
        errors.push(msg);
        if (job) {
          await job.log(`${logPrefix} - [ERROR] ${msg}`);
        }
      }

      // 更新进度
      if (job) {
        const progress = Math.round(((i + 1) / totalMeetings) * 100);
        await job.updateProgress(progress);
      }
    }

    if (totalMeetings === 0 && job) {
      await job.updateProgress(100);
    }

    return { meetingsUpserted, recordingsUpserted, errors };
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
    deduplicated: ParticipantDetail[],
  ) {
    // 1. 检查是否已处理过该转写记录
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
          `Failed to fetch transcript page for recording ${recordFileId} (pid: ${currentPid}): ${(err as Error).message}`,
        );
        break; // Stop fetching on error
      }
    }

    if (allParagraphs.length > 0) {
      if (!transcriptId) {
        const transcript = await this.transcriptRepo.create({
          source: `tencent-meeting:${recordFileId}`,
          status: 2,
          recordingId,
        });
        transcriptId = transcript.id;
      }

      await this.transcriptBatchProcessor.processParagraphs(
        allParagraphs,
        transcriptId,
      );
    }
  }
}
