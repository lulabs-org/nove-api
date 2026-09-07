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
import {
  LarkMeetingEndedJobData,
  MeetingEndedEventData,
} from '../types/lark-meeting.types';
import { SingleOrgContextService } from '@/admin/system-config/services';

type LarkMeetingEndedQueueData =
  | LarkMeetingEndedJobData
  | MeetingEndedEventData;

@Injectable()
@Processor('lark-events')
export class LarkEventProcessor extends WorkerHost {
  private readonly logger = new Logger(LarkEventProcessor.name);

  constructor(
    private readonly larkMeetingService: LarkMeetingService,
    private readonly orgContext: SingleOrgContextService,
  ) {
    super();
  }

  override async process(
    job: Job<LarkMeetingEndedQueueData>,
  ): Promise<unknown> {
    switch (job.name) {
      case 'meetingEnded': {
        let event: MeetingEndedEventData;
        let orgId: string;
        if ('event' in job.data && 'orgId' in job.data) {
          event = job.data.event;
          orgId = job.data.orgId;
        } else {
          event = job.data;
          orgId = this.orgContext.getOrgId();
          this.logger.warn(
            `Processing legacy Lark job ${job.id ?? 'unknown'} without orgId`,
          );
        }
        await this.larkMeetingService.handleMeetingEnded(event, orgId);
        return { ok: true };
      }
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { ok: false };
    }
  }
}
