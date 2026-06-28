import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { TranscriptRepository } from '@/meeting/repositories/transcript.repository';
import { TranscriptSyncService } from '@/tencent-mtg-hook/services/transcript-sync.service';
import { ParticipantService } from '@/integrations/tencent-meeting/services';
import { SpeakerService } from '@/tencent-mtg-hook/services/speaker.service';
import { MeetingParticipantService } from '@/tencent-mtg-hook/services/meeting-participant.service';
import type { ParticipantDetail } from '@/integrations/tencent-meeting/types';
import { NewTranscriptParagraph } from '@/tencent-mtg-hook/types/transcript.types';

@Injectable()
export class TencentMtgTranscriptSyncService {
  private readonly logger = new Logger(TencentMtgTranscriptSyncService.name);

  constructor(
    private readonly tencentApi: TencentApiService,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly transcriptSyncService: TranscriptSyncService,
    private readonly participantSvc: ParticipantService,
    private readonly speakerSvc: SpeakerService,
    private readonly meetingParticipantSvc: MeetingParticipantService,
  ) {}

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
    forceReSyncTranscript: boolean = false,
    syncParticipants: boolean = true,
  ) {
    let transcriptId: string | undefined;

    const existingTranscript =
      await this.transcriptRepo.findByRecordingId(recordingId);

    if (existingTranscript) {
      if (forceReSyncTranscript) {
        await this.transcriptRepo.deleteSegments(existingTranscript.id);
      } else {
        const segmentCount = await this.transcriptRepo.countSegments(
          existingTranscript.id,
        );
        if (segmentCount > 0) {
          return; // Already processed and has segments
        }
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
      syncParticipants,
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

      await this.transcriptSyncService.sync(allParagraphs, transcriptId);
    }
  }

  async syncParticipantsForTranscript(
    meetid: string,
    subid: string,
    operatorId: string,
    startTime?: number,
    endTime?: number,
    syncParticipants?: boolean,
  ): Promise<ParticipantDetail[]> {
    let participantResult: {
      deduplicated: ParticipantDetail[];
      original: ParticipantDetail[];
    } = { deduplicated: [], original: [] };
    const actualSubid = subid === '__ROOT__' ? undefined : subid;
    try {
      participantResult = await this.participantSvc.list(
        meetid,
        operatorId,
        actualSubid,
        startTime,
        endTime,
      );
    } catch (e) {
      // Check if subMeetingId is illegal and retry without it
      const errMsg = e instanceof Error ? e.message : String(e);
      if (actualSubid && errMsg.includes('subMeetingId is illegal')) {
        this.logger.warn(
          `Retrying participants fetch without subid for meeting ${meetid} due to illegal subid error.`,
        );
        try {
          participantResult = await this.participantSvc.list(
            meetid,
            operatorId,
            undefined,
            startTime,
            endTime,
          );
        } catch (retryError) {
          this.logger.warn(
            `Failed to fetch participants on retry for meeting ${meetid}: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
          );
        }
      } else {
        this.logger.warn(
          `Failed to fetch participants for meeting ${meetid}: ${errMsg}`,
        );
      }
    }

    const deduplicated = participantResult.deduplicated || [];
    if (deduplicated.length > 0) {
      await this.speakerSvc.syncPtUsers(deduplicated);
    }

    if (
      syncParticipants &&
      participantResult.original &&
      participantResult.original.length > 0
    ) {
      await this.meetingParticipantSvc.syncParticipants({
        meetid,
        subid,
        participants: participantResult.original,
      });
    }

    return deduplicated;
  }

  async fetchTranscriptParagraphs(
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
