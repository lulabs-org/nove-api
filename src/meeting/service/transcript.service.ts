import { Injectable } from '@nestjs/common';
import { TranscriptRepository } from '../repositories/transcript.repository';

/**
 * 转写相关服务
 * 负责从不同维度的存储结构中提取并格式化转写文本
 */
@Injectable()
export class TranscriptService {
  constructor(private readonly transcriptRepository: TranscriptRepository) {}

  /**
   * 获取录制的转写文本 (兼容旧版本段落/句子结构)
   */
  async getTranscriptByRecordingId(recordingId: string): Promise<string> {
    const transcript = await this.transcriptRepository.findDetails(recordingId);
    if (!transcript) {
      return '';
    }

    // 按时间排序段落、句子和词
    const paragraphs = Array.from(transcript.paragraphs).sort(
      (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
    );

    let fullText = '';
    for (const p of paragraphs) {
      const sentences = Array.from(p.sentences).sort(
        (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
      );
      let paragraphText = '';
      for (const s of sentences) {
        if (s.text) {
          paragraphText += s.text;
        } else {
          const words = Array.from(s.words).sort(
            (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
          );
          paragraphText += words.map((w) => w.text).join('');
        }
      }
      if (paragraphText) {
        const speakerName = p.speaker?.displayName || '未知发言人';
        const startMs = Number(p.startTimeMs);
        const hh = String(Math.floor(startMs / 3600000)).padStart(2, '0');
        const mm = String(Math.floor((startMs % 3600000) / 60000)).padStart(
          2,
          '0',
        );
        const ss = String(Math.floor((startMs % 60000) / 1000)).padStart(
          2,
          '0',
        );
        const timeStr = `${hh}:${mm}:${ss}`;

        fullText += `${speakerName}(${timeStr}): ${paragraphText}\n\n`;
      }
    }

    return fullText.trim();
  }

  /**
   * 基于段落（Segment）获取录制的转写文本
   */
  async getSegmentTranscript(recordingId: string): Promise<string> {
    const transcript = await this.transcriptRepository.findSegmentsDetails(recordingId);
    if (!transcript || !transcript.segments) {
      return '';
    }

    let fullText = '';
    for (const segment of transcript.segments) {
      if (!segment.text) continue;

      const speakerName = segment.speaker?.displayName || segment.speakerName || '未知发言人';
      const startMs = Number(segment.startTimeMs);
      const hh = String(Math.floor(startMs / 3600000)).padStart(2, '0');
      const mm = String(Math.floor((startMs % 3600000) / 60000)).padStart(
        2,
        '0',
      );
      const ss = String(Math.floor((startMs % 60000) / 1000)).padStart(
        2,
        '0',
      );
      const timeStr = `${hh}:${mm}:${ss}`;

      fullText += `${speakerName}(${timeStr}): ${segment.text}\n\n`;
    }

    return fullText.trim();
  }

  /**
   * 基于段落（Segment）获取录制的转写 JSON
   */
  async getSegmentTranscriptJson(recordingId: string): Promise<any[]> {
    const transcript = await this.transcriptRepository.findSegmentsDetails(recordingId);
    if (!transcript || !transcript.segments) {
      return [];
    }

    return transcript.segments
      .filter((segment) => segment.text)
      .map((segment) => {
        const formatTime = (ms: number) => {
          const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
          const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
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
