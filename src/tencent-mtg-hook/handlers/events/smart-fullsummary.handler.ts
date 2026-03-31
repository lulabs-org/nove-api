/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-25 05:15:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 18:41:16
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/smart-fullsummary.handler.ts
 * @Description: 智能摘要完成事件处理器
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { SmartFullSummaryPayload } from '../../types';

/**
 * 智能摘要完成事件处理器
 */

@Injectable()
export class SmartFullsummaryHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'smart.fullsummary';

  constructor() {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(payload: SmartFullSummaryPayload, index: number): Promise<void> {
    const { recording_files = [] } = payload;

    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    if (recording_files.length === 0) {
      this.logger.warn('No recording files in payload');
      return;
    }

    await Promise.resolve();
  }
}
