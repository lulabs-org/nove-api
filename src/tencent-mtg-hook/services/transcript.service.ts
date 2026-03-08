/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 22:18:37
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/services/transcript.service.ts
 * @Description: 转写服务，负责获取和格式化录音转写内容
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TranscriptFormatterService } from './transcript-formatter.service';
import { TencentApiService } from '@/integrations/tencent-meeting/api.service';
import {
  RecordingTranscriptResponse,
  RecordingTranscriptParagraph,
  SpeakerInfo,
} from '@/integrations/tencent-meeting/types';

/**
 * 转写结果接口
 */
export interface TranscriptResult {
  paragraphs: RecordingTranscriptParagraph[];
  uniqueSpeakerInfos: SpeakerInfo[];
  formattedText: string;
  keywords: string[];
}

/**
 * 转写服务
 * 负责获取和格式化录音转写内容
 */
@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    private readonly tencentMeetingApi: TencentApiService,
    private readonly transcriptFormatterService: TranscriptFormatterService,
  ) {}

  /**
   * 获取录音转写内容
   * @param recordFileId 录制文件ID
   * @param userId 用户ID
   * @returns 包含原始响应、唯一用户名、格式化转写和关键词的结果
   */
  async getTranscript(
    recordFileId: string,
    userId: string,
  ): Promise<TranscriptResult> {
    const startTime = Date.now();
    const context = { recordFileId, userId };

    this.logger.log('开始获取录音转写', context);

    try {
      // 获取转写数据
      const transcriptResponse = await this.tencentMeetingApi.getTranscript(
        recordFileId,
        userId,
      );

      if (!transcriptResponse?.minutes?.paragraphs) {
        return {
          paragraphs: [],
          uniqueSpeakerInfos: [],
          formattedText: '',
          keywords: [],
        };
      }

      // 提取关键词
      const keywords = this.extractKeywords(transcriptResponse);

      // 格式化转写内容
      const formattedTranscript =
        this.transcriptFormatterService.formatTranscript(
          transcriptResponse.minutes.paragraphs,
        );

      const duration = Date.now() - startTime;
      this.logger.log('获取录音转写成功', {
        ...context,
        duration,
        uniqueSpeakerInfosCount: formattedTranscript.speakerInfos.length,
        keywordsCount: keywords.length,
        formattedLinesCount: formattedTranscript
          ? formattedTranscript.formattedText.split('\n\n').length
          : 0,
      });

      return {
        paragraphs: transcriptResponse.minutes.paragraphs,
        uniqueSpeakerInfos: formattedTranscript.speakerInfos,
        formattedText: formattedTranscript.formattedText,
        keywords,
      };
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.warn('获取录音转写失败', {
        ...context,
        error: errorMessage,
      });

      // 返回空结果而不是抛出错误，以保持主流程继续
      return {
        paragraphs: [],
        uniqueSpeakerInfos: [],
        formattedText: '',
        keywords: [],
      };
    }
  }

  /**
   * 提取关键词
   * @param transcriptResponse 转写响应数据
   * @returns 关键词数组
   */
  private extractKeywords(
    transcriptResponse?: RecordingTranscriptResponse,
  ): string[] {
    if (!transcriptResponse?.minutes?.keywords) {
      return [];
    }

    return transcriptResponse.minutes.keywords;
  }

  /**
   * 获取错误消息
   * @param error 错误对象
   * @returns 错误消息字符串
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
