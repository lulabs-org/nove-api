/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 17:56:51
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 18:23:14
 * @FilePath: /nove_api/src/lark-meeting/services/lark-event-ws.service.ts
 * @Description:
 * *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import { LarkClient } from '@/integrations/lark/lark.client';
import { LarkMeetingService } from './lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { LarkEvent } from '../enums/lark-event.enum';

@Injectable()
export class LarkEventWsService implements OnModuleInit {
  constructor(
    private readonly larkClient: LarkClient,
    private readonly larkMeetingService: LarkMeetingService,
  ) {}

  onModuleInit() {
    const dispatcher = new Lark.EventDispatcher({}).register({
      [LarkEvent.VC_MEETING_ALL_ENDED_V1]: async (
        data: MeetingEndedEventData,
      ) => {
        try {
          await this.larkMeetingService.enqueueMeetingEnded(data);
        } catch {
          return;
        }
      },
      '*': () => undefined,
    });
    void this.larkClient.wsClient.start({ eventDispatcher: dispatcher });
  }
}
