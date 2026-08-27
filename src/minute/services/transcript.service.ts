import { Injectable, NotFoundException } from '@nestjs/common';
import { TranscriptRepository } from '../repositories/transcript.repository';
import {
  CreateTranscriptDto,
  TranscriptJsonResponseDto,
} from '../dto/transcript.dto';
import { formatTimeMs } from '@/common/utils/time.util';

/**
 * 转写相关服务
 * 负责从不同维度的存储结构中提取并格式化转写文本
 */
@Injectable()
export class TranscriptService {
  constructor(private readonly transcriptRepository: TranscriptRepository) {}

  /**
   * 获取转写原始记录（含 segments）
   */
  async getDetails(minuteId: string) {
    const transcript = await this.transcriptRepository.findDetails(minuteId);
    if (!transcript) {
      throw new NotFoundException(`转录记录不存在: ${minuteId}`);
    }
    return transcript;
  }

  async create(data: CreateTranscriptDto) {
    return this.transcriptRepository.create({
      source: data.source,
      rawFileUrl: data.rawFileUrl,
      status: data.status ?? 0,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      minuteId: data.minuteId,
    });
  }

  /**
   * 基于段落（Segment）获取录制的转写文本
   */
  async getText(minuteId: string): Promise<string> {
    const transcript = await this.transcriptRepository.findDetails(minuteId);
    if (!transcript) {
      throw new NotFoundException(`转录记录不存在: ${minuteId}`);
    }
    if (!transcript.segments) {
      return '';
    }

    let fullText = '';
    for (const segment of transcript.segments) {
      const speakerName = segment.speakerName || '未知发言人';
      const startMs = Number(segment.startTimeMs);
      const timeStr = formatTimeMs(startMs);

      fullText += `${speakerName}(${timeStr}): ${segment.text}\n\n`;
    }

    return fullText.trim();
  }

  /**
   * 基于段落（Segment）获取录制的转写 JSON
   */
  async getJson(
    minuteId: string,
    includeLocalUser = false,
  ): Promise<TranscriptJsonResponseDto> {
    const transcript = includeLocalUser
      ? await this.transcriptRepository.findDetailsWithLocalUser(minuteId)
      : await this.transcriptRepository.findDetails(minuteId);

    if (!transcript) {
      throw new NotFoundException(`转录记录不存在: ${minuteId}`);
    }

    return {
      transcriptId: transcript.id,
      data: transcript.segments.map((segment) => {
        type SpeakerWithUser = {
          id: string;
          displayName: string | null;
          user?: {
            id: string;
            profile: {
              displayName: string | null;
              fullName: string | null;
            } | null;
          } | null;
        };
        const speaker = segment.speaker as SpeakerWithUser | null;
        const user = includeLocalUser ? speaker?.user : null;

        return {
          id: segment.id,
          speakerName: segment.speakerName || '未知发言人',
          startTime: formatTimeMs(Number(segment.startTimeMs)),
          endTime: formatTimeMs(Number(segment.endTimeMs)),
          text: segment.text,
          platformUser: speaker
            ? { id: speaker.id, displayName: speaker.displayName }
            : null,
          user: user
            ? {
                id: user.id,
                displayName: user.profile?.displayName ?? null,
                fullName: user.profile?.fullName ?? null,
              }
            : null,
        };
      }),
    };
  }
}
