/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 09:15:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 02:51:51
 * @FilePath: /nove_api/src/tencent-mtg/handlers/events/meeting-ended.handler.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { MeetingEndPayload } from '../../types';
import { TMeetMeetingCoreService } from '../../services/meeting-core.service';

/**
 * 会议结束事件处理器
 */
@Injectable()
export class MeetingEndedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'meeting.end';

  constructor(
    private readonly meetingCoreSvc: TMeetMeetingCoreService,
  ) {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(payload: MeetingEndPayload, index: number): Promise<void> {
    const { meeting_info, operator } = payload;

    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    if (!meeting_info || !operator) {
      this.logger.warn('Missing required meeting_info or operator in payload');
      return;
    }

    const tasks = [
      this.meetingCoreSvc.upsertMeetingFromWebhook(
        payload,
        this.SUPPORTED_EVENT,
      ),
    ];

    await Promise.allSettled(tasks);
  }
}
