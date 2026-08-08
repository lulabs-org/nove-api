import { Injectable, NotFoundException } from '@nestjs/common';
import { TranscriptRepository } from '../repositories/transcript.repository';

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
  async getDetails(recordingId: string) {
    const transcript = await this.transcriptRepository.findDetails(recordingId);
    if (!transcript) {
      throw new NotFoundException(`转录记录不存在: ${recordingId}`);
    }
    return transcript;
  }

  /**
   * 基于段落（Segment）获取录制的转写文本
   */
  async getText(recordingId: string): Promise<string> {
    const transcript = await this.transcriptRepository.findDetails(recordingId);
    if (!transcript || !transcript.segments) {
      return '';
    }

    let fullText = '';
    for (const segment of transcript.segments) {
      if (!segment.text) continue;

      const speakerName =
        segment.speaker?.displayName || segment.speakerName || '未知发言人';
      const startMs = Number(segment.startTimeMs);
      const hh = String(Math.floor(startMs / 3600000)).padStart(2, '0');
      const mm = String(Math.floor((startMs % 3600000) / 60000)).padStart(
        2,
        '0',
      );
      const ss = String(Math.floor((startMs % 60000) / 1000)).padStart(2, '0');
      const timeStr = `${hh}:${mm}:${ss}`;

      fullText += `${speakerName}(${timeStr}): ${segment.text}\n\n`;
    }

    return fullText.trim();
  }

  /**
   * 基于段落（Segment）获取录制的转写 JSON
   */
  async getJson(recordingId: string): Promise<any[]> {
    const transcript = await this.transcriptRepository.findDetails(recordingId);
    if (!transcript || !transcript.segments) {
      return [];
    }

    return transcript.segments
      .filter((segment) => segment.text)
      .map((segment) => {
        const formatTime = (ms: number) => {
          const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
          const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(
            2,
            '0',
          );
          const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
          return `${hh}:${mm}:${ss}`;
        };

        return {
          speakerName:
            segment.speaker?.displayName || segment.speakerName || '未知发言人',
          startTime: formatTime(Number(segment.startTimeMs)),
          endTime: formatTime(Number(segment.endTimeMs)),
          text: segment.text,
        };
      });
  }
}
