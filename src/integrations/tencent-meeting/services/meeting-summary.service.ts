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
  summary: string;
  minutes: string;
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

    // 使用 Promise.all 并行获取“智能摘要”和“会议纪要”，提升接口响应速度
    // 在每个 Promise 后面直接链式调用 .catch()，确保单个接口报错时不影响另一个接口的数据返回（降级处理）
    const [summary, { minutes, todo }] = await Promise.all([
      // 1. 获取并处理智能摘要
      this.api
        .getSmartFullSummary(fileId, userId)
        .then((res) => {
          this.logger.log(`智能摘要获取成功: fileId=${fileId}`);
          // 接口返回的摘要内容通常是 Base64 编码，这里进行解码提取纯文本
          return ContentUtils.decodeBase64Content(res.ai_summary);
        })
        .catch((error) => {
          this.logger.error(
            `智能摘要获取失败: ${error instanceof Error ? error.message : String(error)}`,
          );
          return ''; // 失败时提供默认降级值，保证流程继续
        }),

      // 2. 获取并处理会议纪要及待办事项
      this.api
        .getSmartMeetingMinutes(fileId, userId)
        .then((res) => {
          this.logger.log(`会议纪要获取成功: fileId=${fileId}`);
          // 提取返回结构中的纪要与待办字段，防止字段为空
          const { minute, todo } = res.meeting_minute ?? {};
          return { minutes: minute ?? '', todo: todo ?? '' };
        })
        .catch((error) => {
          this.logger.error(
            `会议纪要获取失败: ${error instanceof Error ? error.message : String(error)}`,
          );
          return { minutes: '', todo: '' }; // 失败时提供默认降级值
        }),
    ]);

    this.logger.log(`会议内容获取完成: fileId=${fileId}`);

    return { summary, minutes, todo };
  }
}
