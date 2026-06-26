/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:00:11
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:11:28
 * @FilePath: /nove_api/src/meet-ai/services/meet-ai.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ParticipantSummaryService } from './participant-summary.service';

@Injectable()
export class MeetAiService {
  private readonly logger = new Logger(MeetAiService.name);

  constructor(
    private readonly participantSummaryService: ParticipantSummaryService,
  ) {}

  async generateParticipantSummary(recordId: string, platformUserId: string) {
    this.logger.log(`生成参会者总结: ${recordId}, ${platformUserId}`);
    await this.participantSummaryService.generateSummary(
      recordId,
      platformUserId,
    );
    return { success: true, message: '参会者总结生成成功' };
  }
}
