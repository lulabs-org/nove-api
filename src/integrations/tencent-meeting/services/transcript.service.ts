/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 01:01:29
 * @FilePath: /nove_api/src/integrations/tencent-meeting/services/transcript.service.ts
 * @Description: 转写服务，负责获取和格式化录音转写内容
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from './api.service';
import { TranscriptFormatterService } from './transcript-formatter.service';
import { TranscriptResult } from '../types';

/**
 * 转写服务
 * 负责获取和格式化录音转写内容
 */
@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private readonly emptyResult: TranscriptResult = {
    paragraphs: [],
    uniqueSpeakerInfos: [],
    formattedText: '',
    keywords: [],
  };

  constructor(
    private readonly api: TencentApiService,
    private readonly formatter: TranscriptFormatterService,
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
      const transcriptResponse = await this.api.getTranscript(
        recordFileId,
        userId,
      );

      if (!transcriptResponse?.minutes?.paragraphs) {
        return this.emptyResult;
      }

      const { minutes } = transcriptResponse;
      const { paragraphs } = minutes;
      const keywords = minutes.keywords || [];
      const { speakerInfos, formattedText } = this.formatter.format(paragraphs);

      const duration = Date.now() - startTime;

      this.logger.log('获取录音转写成功', {
        ...context,
        duration,
        uniqueSpeakerInfosCount: speakerInfos.length,
        keywordsCount: keywords.length,
        formattedLinesCount: formattedText.split('\n\n').length,
      });

      return {
        paragraphs,
        uniqueSpeakerInfos: speakerInfos,
        formattedText,
        keywords,
      };
    } catch (error: unknown) {
      this.logger.warn('获取录音转写失败', {
        ...context,
        error: this.getErrorMessage(error),
      });

      return this.emptyResult;
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  }
}
