/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 09:15:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-05 01:48:37
 * @FilePath: /nove_api/src/hook-tencent-mtg/handlers/events/meeting-started.handler.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { StartedPayload } from '../../types/tencent-event.types';
import { MeetingBitableService } from '../../services/meeting-bitable.service';
import { MeetingDatabaseService } from '../../services/meeting-database.service';

/**
 * 会议开始事件处理器
 */
@Injectable()
export class MeetingStartedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'meeting.started';

  constructor(
    private readonly meetingBitableService: MeetingBitableService,
    private readonly meetingDatabaseService: MeetingDatabaseService,
  ) {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(payload: StartedPayload, index: number): Promise<void> {
    const { meeting_info, operator } = payload;

    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    if (!meeting_info || !operator) {
      this.logger.warn('Missing required meeting_info or operator in payload');
      return;
    }

    const tasks = [
      this.meetingBitableService.upsertMeetingUserRecord(operator),
      this.meetingBitableService.updateMeetingParticipants(
        meeting_info,
        operator,
      ),
      this.meetingDatabaseService.upsertMeetingRecord(payload, this.SUPPORTED_EVENT),
      this.meetingDatabaseService.upsertPlatformUser(operator),
    ];

    if (operator.uuid !== meeting_info.creator.uuid) {
      tasks.push(
        this.meetingBitableService.upsertMeetingUserRecord(
          meeting_info.creator,
        ),
      );
    }

    await Promise.allSettled(tasks);
  }
}
