/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 03:21:32
 * @FilePath: /nove_api/src/integrations/tencent-meeting/services/meeting-summary.service.ts
 * @Description: 录制内容服务，负责获取会议内容（摘要、纪要等）
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from './api.service';
import { ContentUtils } from '../utils/content.utils';

export interface MeetingContent {
  fullSummary: string;
  aiMinutes: string;
  todo: string;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly api: TencentApiService) {}

  /**
   * 获取会议内容（摘要、纪要等）
   * @param fileId 录制文件ID
   * @param userId 用户ID
   * @returns 会议内容
   */
  async getContent(fileId: string, userId: string): Promise<MeetingContent> {
    this.logger.log(`获取会议内容: fileId=${fileId}, userId=${userId}`);

    const result: MeetingContent = {
      fullSummary: '',
      aiMinutes: '',
      todo: '',
    };

    try {
      const response = await this.api.getSmartFullSummary(fileId, userId);

      result.fullSummary = ContentUtils.decodeBase64Content(
        response.ai_summary,
      );

      this.logger.log(`智能摘要获取成功: fileId=${fileId}`);
    } catch (error) {
      this.logger.error(
        `智能摘要获取失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      const response = await this.api.getSmartMeetingMinutes(fileId, userId);
      const { minute, todo } = response.meeting_minute ?? {};

      result.aiMinutes = minute ?? '';
      result.todo = todo ?? '';
      this.logger.log(`会议纪要获取成功: fileId=${fileId}`);
    } catch (error) {
      this.logger.error(
        `会议纪要获取失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(`会议内容获取完成: fileId=${fileId}`);

    return result;
  }
}
