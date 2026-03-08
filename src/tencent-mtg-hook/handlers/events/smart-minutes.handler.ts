/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-30 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 13:34:34
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/smart-minutes.handler.ts
 * @Description: 智能纪要完成事件处理器
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { SmartFullSummaryPayload } from '../../types/tencent-event.types';

/**
 * 智能纪要完成事件处理器
 */
@Injectable()
export class SmartMinutesHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'smart.minutes';

  constructor() {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(payload: SmartFullSummaryPayload, index: number): Promise<void> {
    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    await Promise.resolve();
  }
}
