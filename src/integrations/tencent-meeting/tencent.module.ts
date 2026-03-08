/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 01:08:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 01:29:01
 * @FilePath: /nove_api/src/integrations/tencent-meeting/tencent.module.ts
 * @Description: 腾讯会议模块
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import {
  TencentApiService,
  TranscriptService,
  RecordingContentService,
  TranscriptFormatterService,
} from './services';

@Module({
  imports: [ConfigModule.forFeature(tencentMeetingConfig)],
  providers: [
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    RecordingContentService,
  ],
  exports: [
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    RecordingContentService,
  ],
})
export class TencentModule {}
