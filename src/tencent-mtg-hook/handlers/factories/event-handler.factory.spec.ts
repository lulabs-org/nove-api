/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 02:20:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-23 02:15:05
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/factories/event-handler.factory.spec.ts
 * @Description: Event handler factory test
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { EventHandlerFactory } from './event-handler.factory';
import { BaseEventHandler } from '../base/base-event.handler';
import { TencentEventPayload } from '../../types/tencent-event.types';

// Mock event handlers
class TestEventHandler1 extends BaseEventHandler {
  static readonly SUPPORTED_EVENT = 'test.event1';

  supports(event: string): boolean {
    return event === TestEventHandler1.SUPPORTED_EVENT;
  }

  handle(payload: TencentEventPayload, index: number): Promise<void> {
    // Mock implementation - ignore parameters
    void payload;
    void index;
    return Promise.resolve();
  }
}

class TestEventHandler2 extends BaseEventHandler {
  static readonly SUPPORTED_EVENTS = ['test.event2', 'test.event3'];

  supports(event: string): boolean {
    return TestEventHandler2.SUPPORTED_EVENTS.includes(event);
  }

  handle(payload: TencentEventPayload, index: number): Promise<void> {
    // Mock implementation - ignore parameters
    void payload;
    void index;
    return Promise.resolve();
  }
}

describe('EventHandlerFactory', () => {
  let factory: EventHandlerFactory;
  let handler1: TestEventHandler1;
  let handler2: TestEventHandler2;

  beforeEach(() => {
    // 直接实例化处理器
    handler1 = new TestEventHandler1();
    handler2 = new TestEventHandler2();

    // 创建工厂实例并手动传入处理器
    factory = new EventHandlerFactory([handler1, handler2]);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should get the correct handler for a supported event', () => {
    const handler = factory.getHandler('test.event1');
    expect(handler).toBeInstanceOf(TestEventHandler1);
  });

  it('should get the correct handler for multiple supported events', () => {
    const handler2 = factory.getHandler('test.event2');
    const handler3 = factory.getHandler('test.event3');

    expect(handler2).toBeInstanceOf(TestEventHandler2);
    expect(handler3).toBeInstanceOf(TestEventHandler2);
  });

  it('should return null for an unsupported event', () => {
    const handler = factory.getHandler('unsupported.event');
    expect(handler).toBeNull();
  });

  it('should get all supported events', () => {
    const events = factory.getSupportedEvents();
    expect(events).toEqual(
      expect.arrayContaining(['test.event1', 'test.event2', 'test.event3']),
    );
    expect(events.length).toBe(3);
  });

  it('should get all registered handlers', () => {
    const handlers = factory.getAllHandlers();
    expect(handlers.length).toBe(2);
    expect(
      handlers.some((handler) => handler instanceof TestEventHandler1),
    ).toBe(true);
    expect(
      handlers.some((handler) => handler instanceof TestEventHandler2),
    ).toBe(true);
  });

  it('should check if an event is supported', () => {
    expect(factory.isEventSupported('test.event1')).toBe(true);
    expect(factory.isEventSupported('test.event2')).toBe(true);
    expect(factory.isEventSupported('unsupported.event')).toBe(false);
  });
});
