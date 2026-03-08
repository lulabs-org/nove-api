/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-27
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 19:04:46
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/smart-transcripts.handler.ts
 * @Description: 录制转写生成事件处理器
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { SmartTranscriptsPayload } from '../../types/tencent-event.types';

/**
 * 录制转写生成事件处理器
 */
@Injectable()
export class SmartTranscriptsHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'smart.transcripts';

  constructor() {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(payload: SmartTranscriptsPayload, index: number): Promise<void> {
    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    await Promise.resolve();
  }
}
