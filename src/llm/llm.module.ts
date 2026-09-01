/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 01:08:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-01 13:56:22
 * @FilePath: /lulab_backend/src/llm/llm.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
