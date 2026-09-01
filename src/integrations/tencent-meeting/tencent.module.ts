/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 01:08:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 03:21:50
 * @FilePath: /nove_api/src/integrations/tencent-meeting/tencent.module.ts
 * @Description: 腾讯会议模块
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { ParticipantService } from './services/meeting-participant.service';
import {
  TencentApiService,
  TranscriptService,
  SummaryService,
  TranscriptFormatterService,
} from './services';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    SummaryService,
    ParticipantService,
  ],
  exports: [
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    SummaryService,
    ParticipantService,
  ],
})
export class TencentModule {}
