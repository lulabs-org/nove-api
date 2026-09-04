/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-11 20:21:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-23 04:18:20
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/factories/event-handler.factory.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';

/**
 * 事件处理器工厂
 */
@Injectable()
export class EventHandlerFactory {
  constructor(
    // 使用依赖注入自动发现所有事件处理器
    @Inject('BaseEventHandler[]')
    private readonly eventHandlers: BaseEventHandler[],
  ) {}

  /**
   * 获取事件处理器
   */
  getHandler(event: string): BaseEventHandler | null {
    return (
      this.eventHandlers.find((handler) => handler.supports(event)) || null
    );
  }

  /**
   * 获取支持的事件类型列表
   */
  getSupportedEvents(): string[] {
    const supportedEvents = new Set<string>();

    // 收集所有处理器支持的事件
    this.eventHandlers.forEach((handler) => {
      // 尝试获取处理器的支持事件
      const events = this.extractSupportedEvents(handler);
      events.forEach((event) => supportedEvents.add(event));
    });

    return Array.from(supportedEvents);
  }

  /**
   * 从处理器中提取支持的事件类型
   */
  private extractSupportedEvents(handler: BaseEventHandler): string[] {
    const handlerClass = handler.constructor as unknown as Record<
      string,
      unknown
    >;

    // 尝试获取处理器类的 SUPPORTED_EVENT 静态属性
    const supportedEvent = handlerClass.SUPPORTED_EVENT as string | undefined;
    if (supportedEvent) {
      return [supportedEvent];
    }

    // 尝试获取处理器类的 SUPPORTED_EVENTS 静态属性（支持多个事件）
    const supportedEvents = handlerClass.SUPPORTED_EVENTS as
      | string[]
      | undefined;
    if (Array.isArray(supportedEvents)) {
      return supportedEvents;
    }

    return [];
  }

  /**
   * 获取所有注册的事件处理器
   */
  getAllHandlers(): BaseEventHandler[] {
    return [...this.eventHandlers];
  }

  /**
   * 检查事件是否被支持
   */
  isEventSupported(event: string): boolean {
    return this.getHandler(event) !== null;
  }
}
