/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-20 22:01:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 19:28:24
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/services/event-handler.service.ts
 * @Description: Tencent Meeting event handler service
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentMeetingEvent, TencentEventPayload } from '../types';
import { EventHandlerFactory } from '../handlers/factories/event-handler.factory';

/**
 * Tencent Meeting event handler service
 * - using factory pattern
 * Separates handling logic for different events into different handlers
 */

@Injectable()
export class TencentEventHandlerService {
  private readonly logger = new Logger(TencentEventHandlerService.name);

  constructor(private readonly eventHandlerFactory: EventHandlerFactory) {}

  /**
   * Handle Tencent Meeting events
   */
  async handleEvent(eventData: TencentMeetingEvent): Promise<void> {
    const { event, payload } = eventData;

    this.logEventDetails(eventData);

    // 检查事件是否被支持
    if (!this.eventHandlerFactory.isEventSupported(event)) {
      this.logger.warn(`Unsupported Tencent Meeting event: ${event}`);
      return; // 不抛出错误，避免影响主流程
    }

    const handler = this.eventHandlerFactory.getHandler(event);
    if (!handler) {
      this.logger.error(`No handler found for Tencent Meeting event: ${event}`);
      return; // 不抛出错误，避免影响主流程
    }

    try {
      // Batch process payloads
      const processingPromises = payload.map((item, index: number) =>
        handler.handle(item as TencentEventPayload, index),
      );

      // 并行处理所有负载
      await Promise.all(processingPromises);

      this.logger.log(`Tencent Meeting event processing completed: ${event}`);
    } catch (error) {
      this.logger.error(
        `Tencent Meeting event processing failed: ${event}`,
        error,
      );
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * Log event details
   */
  private logEventDetails(eventData: TencentMeetingEvent): void {
    this.logger.log('Event received details:', {
      event: eventData.event,
      traceId: eventData.trace_id,
      payloadCount: eventData.payload.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get supported event types
   */
  getSupportedEvents(): string[] {
    return this.eventHandlerFactory.getSupportedEvents();
  }
}
