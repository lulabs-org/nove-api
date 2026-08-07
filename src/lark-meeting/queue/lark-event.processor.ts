/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 11:04:20
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 11:04:26
 * @FilePath: /lulab_backend/src/lark-meeting/queue/lark-event.processor.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/lark-meeting/queue/lark-event.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';

@Injectable()
@Processor('lark-events')
export class LarkEventProcessor extends WorkerHost {
  private readonly logger = new Logger(LarkEventProcessor.name);

  constructor(private readonly larkMeetingService: LarkMeetingService) {
    super();
  }

  override async process(job: Job<Record<string, unknown>>): Promise<unknown> {
    switch (job.name) {
      case 'meetingEnded':
        await this.larkMeetingService.handleMeetingEnded(
          job.data as unknown as MeetingEndedEventData,
        );
        return { ok: true };
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { ok: false };
    }
  }
}
