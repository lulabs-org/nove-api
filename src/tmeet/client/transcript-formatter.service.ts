/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 03:04:38
 * @FilePath: /nove_api/src/integrations/tencent-meeting/services/transcript-formatter.service.ts
 * @Description: 转写格式化服务，负责格式化录音转写内容
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TranscriptSentence,
  TranscriptWord,
  TranscriptParagraph,
  SpeakerInfo,
} from '../types/transcript.types';
import { FormatUtils } from '../utils/format.utils';

/**
 * 格式化后的转写结果
 */
export interface FormattedTranscript {
  /**
   * 格式化后的纯文本转写内容
   *
   * @example
   * ```text
   * 张三(00:00:10)：大家好，今天我们来讨论一下。
   *
   * 李四(00:00:15)：同意，我觉得首先需要解决体验问题。
   * ```
   */
  text: string;

  /**
   * 会议中提取出的所有唯一发言人信息列表
   */
  speakers: SpeakerInfo[];
}

/**
 * 转写格式化服务
 * 负责格式化录音转写内容
 */
@Injectable()
export class TranscriptFormatterService {
  private readonly logger = new Logger(TranscriptFormatterService.name);

  /**
   * 格式化转写内容
   * @param transcript 转写响应数据
   * @returns 格式化后的转写文本和唯一用户名
   */
  format(transcript?: TranscriptParagraph[]): FormattedTranscript {
    if (!transcript?.length) {
      return {
        text: '',
        speakers: [],
      };
    }

    const speakerMap = new Map<string, SpeakerInfo>();
    const lines: string[] = [];

    for (const paragraph of transcript) {
      const speakerInfo = paragraph.speaker_info;
      const speakerName = speakerInfo?.username || '未知发言人';

      // 提取所有唯一的发言人信息，使用 Map 提升查询和去重效率 O(1)
      if (speakerInfo?.username && !speakerMap.has(speakerInfo.username)) {
        speakerMap.set(speakerInfo.username, speakerInfo);
      }

      // 格式化转写内容为指定格式 - 将每个段落的所有句子组合成段落
      const firstSentence = paragraph.sentences?.[0];
      if (firstSentence) {
        const startTime = firstSentence.start_time;
        const timeString = FormatUtils.formatTimestamp(startTime);

        // 将段落中的所有句子组合成一个段落文本，增加安全链式调用
        const paragraphText = paragraph.sentences
          .map(
            (sentence: TranscriptSentence) =>
              sentence.words
                ?.map((word: TranscriptWord) => word.text)
                .join('') || '',
          )
          .join('')
          .trim();

        // 即使文本为空，也要添加格式化行（为了保持时间戳信息）
        lines.push(`${speakerName}(${timeString})：${paragraphText}`);
      }
    }

    const speakers = Array.from(speakerMap.values());
    const text = lines.join('\n\n');
    this.logger.log(
      `格式化转写成功, 共 ${lines.length} 条记录, 提取到 ${speakers.length} 个唯一发言人`,
    );

    return {
      text,
      speakers,
    };
  }
}
