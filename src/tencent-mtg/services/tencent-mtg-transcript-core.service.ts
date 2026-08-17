import { Injectable, Logger } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { TranscriptRepository } from '@/meeting/repositories/transcript.repository';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { ParticipantService } from '@/integrations/tencent-meeting/services';
import { SpeakerService } from '@/tencent-mtg/services/speaker.service';
import { MeetingParticipantService } from '@/tencent-mtg/services/meeting-participant.service';
import type { ParticipantDetail } from '@/integrations/tencent-meeting/types';
import { NewTranscriptParagraph } from '@/tencent-mtg/types/transcript.types';

@Injectable()
export class TencentMtgTranscriptCoreService {
  private readonly logger = new Logger(TencentMtgTranscriptCoreService.name);
  private readonly PARAGRAPH_BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly tencentApi: TencentApiService,
    private readonly participantSvc: ParticipantService,
    private readonly speakerSvc: SpeakerService,
    private readonly meetingParticipantSvc: MeetingParticipantService,
  ) {}

  // ==========================================
  // 从 API 数据中拉取处理转写入库
  // ==========================================
  async syncFromApi(
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

    // 步骤 1: 检查数据库中是否已经存在该录制文件的主转写记录 (Transcript)
    const existingTranscript =
      await this.transcriptRepo.findByRecordingId(recordingId);

    if (existingTranscript) {
      if (forceReSyncTranscript) {
        // 如果要求强制重新同步，先删除旧的所有转写片段 (Segments)，准备覆盖
        await this.transcriptRepo.deleteSegments(existingTranscript.id);
      } else {
        // 如果不强制同步，且数据库中已经存在分段，则判定为已同步过，直接跳过，避免重复拉取
        const segmentCount = await this.transcriptRepo.countSegments(
          existingTranscript.id,
        );
        if (segmentCount > 0) return;
      }
      transcriptId = existingTranscript.id;
    }

    // 步骤 2: 准备参会者数据 (去重后的明细)，主要用于后续给每一段话匹配对应的“说话人(Speaker)”
    const deduplicated = await this.syncParticipantsForTranscript(
      meetid,
      subid,
      operatorId,
      startTime,
      endTime,
      syncParticipants,
    );

    // 步骤 3: 循环分页拉取腾讯 API 中的全量逐字稿片段，并在内部利用 deduplicated 完成说话人的映射
    const allParagraphs = await this.fetchTranscriptParagraphs(
      recordFileId,
      operatorId,
      deduplicated,
    );

    // 步骤 4: 如果拉取到了转写文本，将其批量写入我们的数据库
    if (allParagraphs.length > 0) {
      if (!transcriptId) {
        // 如果此前不存在主转写记录，先创建一条 Transcript 主记录
        const transcript = await this.transcriptRepo.create({
          source: `tencent-meeting:${recordFileId}`,
          status: 2,
          recordingId,
        });
        transcriptId = transcript.id;
      }
      // 批量将拼装好的段落 (Segments) 写入数据库中
      await this.batchInsertSegments(allParagraphs, transcriptId);
    }
  }

  // ==========================================
  // 从 Webhook 数据处理转写入库
  // ==========================================
  async syncFromWebhook(
    recordingId: string,
    recordFileId: string,
    paragraphs: NewTranscriptParagraph[],
  ) {
    let transcript = await this.transcriptRepo.findByRecordingId(recordingId);
    if (!transcript) {
      transcript = await this.transcriptRepo.create({
        source: `tencent-meeting:${recordFileId}`,
        status: 2,
        recordingId: recordingId,
      });
      await this.batchInsertSegments(paragraphs, transcript.id);
    }
  }

  // ==========================================
  // 核心批量插入方法
  // ==========================================
  private async batchInsertSegments(
    paragraphs: NewTranscriptParagraph[],
    transcriptId: string,
  ): Promise<void> {
    for (let i = 0; i < paragraphs.length; i += this.PARAGRAPH_BATCH_SIZE) {
      const batch = paragraphs.slice(i, i + this.PARAGRAPH_BATCH_SIZE);
      await this.prisma.$transaction(async (tx) => {
        const segmentsToCreate: any[] = [];
        for (const paragraph of batch) {
          const speakerInfo = paragraph.speaker_info;
          const ptUnionId = speakerInfo.uuid;
          let platformUser: PlatformUser | null = null;
          if (ptUnionId) {
            platformUser = await this.ptUserRepo.upsert(
              { platform: Platform.TENCENT_MEETING, ptUnionId },
              {
                displayName: speakerInfo.username,
                ptUserId: speakerInfo.userid,
                phoneHash: speakerInfo.phone,
              },
            );
          }
          const speakerId = platformUser?.id;
          for (const sentence of paragraph.sentences) {
            const text = sentence.words.map((w) => w.text).join('');
            const wordsDetail = sentence.words.map((w) => ({
              word: w.text,
              start: Number(w.start_time),
              end: Number(w.end_time),
            }));
            segmentsToCreate.push({
              transcriptId,
              speakerId,
              speakerName: speakerInfo.username || null,
              startTimeMs: BigInt(sentence.start_time),
              endTimeMs: BigInt(sentence.end_time),
              text,
              confidence: null,
              wordsDetail,
            });
          }
        }
        if (segmentsToCreate.length > 0) {
          await tx.transcriptSegment.createMany({ data: segmentsToCreate });
        }
      });
    }
  }

  // ==========================================
  // 私有辅助方法：拉取参会者与匹配
  // ==========================================
  public async syncParticipantsForTranscript(
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
        } catch {
          this.logger.warn(
            `Failed to fetch participants on retry for meeting ${meetid}`,
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
      const meeting = await this.prisma.meeting.findFirst({
        where: {
          platform: Platform.TENCENT_MEETING,
          meetingId: meetid,
          subMeetingId: actualSubid || '__ROOT__',
        },
      });
      if (meeting) {
        await this.meetingParticipantSvc.syncParticipants(
          meeting,
          participantResult.original,
        );
      }
    }

    return deduplicated;
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
          const mappedParagraphs = await Promise.all(
            res.minutes.paragraphs.map(async (p) => ({
              ...p,
              speaker_info: await this.speakerSvc.enrichSpeakerInfo(
                p.speaker_info,
                deduplicated,
              ),
            })),
          );
          allParagraphs.push(...mappedParagraphs);
          const lastParagraph =
            res.minutes.paragraphs[res.minutes.paragraphs.length - 1];
          currentPid = lastParagraph.pid;
        }
        hasMore = res.more === true;
      } catch {
        this.logger.warn(
          `Failed to fetch transcript page for recording ${recordFileId} (pid: ${currentPid})`,
        );
        break;
      }
    }
    return allParagraphs;
  }
}
