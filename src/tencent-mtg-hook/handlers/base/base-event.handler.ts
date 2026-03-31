/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-20 22:01:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 21:12:25
 * @FilePath: /nove_api/src/tencent-mtg-hook/handlers/base/base-event.handler.ts
 * @Description: Base event handler for Tencent Meeting
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventPayload } from '../../types';

/**
 * Base event handler for Tencent Meeting events
 * Provides common functionality for all event handlers
 */
@Injectable()
export abstract class BaseEventHandler {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly PLATFORM_NAME = 'TENCENT_MEETING';

  /**
   * Check if the handler supports the given event
   * @param event Event name
   */
  abstract supports(event: string): boolean;

  /**
   * Handle the event
   * @param payload Event payload
   * @param index Payload index in batch processing
   */
  abstract handle(payload: EventPayload, index: number): Promise<void>;

  /**
   * Log event processing details
   */
  protected logEventProcessing(
    eventName: string,
    payload: EventPayload,
    index: number,
  ): void {
    const logData: Record<string, unknown> = {
      event: eventName,
      index,
      operateTime: new Date(payload.operate_time).toISOString(),
      timestamp: new Date().toISOString(),
    };

    if ('meeting_info' in payload && payload.meeting_info) {
      logData.meetingId = payload.meeting_info.meeting_id;
    }

    if ('operator' in payload && payload.operator) {
      if ('userid' in payload.operator) {
        logData.operatorId = payload.operator.userid;
      }
    }

    this.logger.log(`Processing ${eventName} event [${index}]`, logData);
  }
}
