/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 04:23:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-24 05:00:00
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/meeting-participant-joined.handler.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { ParticipantJoinedPayload } from '../../types';
import { MeetingBitableService } from '../../services/meeting-bitable.service';
import { MeetingDatabaseService } from '../../services/meeting-database.service';

/**
 * Meeting participant joined event handler
 * Handles meeting.participant-joined events
 */
@Injectable()
export class MeetingParticipantJoinedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'meeting.participant-joined';

  constructor(
    private readonly meetingBitableService: MeetingBitableService,
    private readonly meetingDatabaseService: MeetingDatabaseService,
  ) {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(
    payload: ParticipantJoinedPayload,
    index: number,
  ): Promise<void> {
    const { meeting_info, operator } = payload;

    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    if (!meeting_info || !operator) {
      this.logger.warn('Missing required meeting_info or operator in payload');
      return;
    }

    await Promise.allSettled([
      this.meetingDatabaseService.upsertPlatformUser(operator),
      this.meetingBitableService.upsertMeetingUserRecord(meeting_info.creator),
      this.meetingBitableService.upsertMeetingUserRecord(operator),
      this.meetingBitableService.updateMeetingParticipants(
        meeting_info,
        operator,
      ),
    ]);
  }
}
