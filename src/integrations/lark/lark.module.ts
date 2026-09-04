/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-02 21:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-05 00:40:03
 * @FilePath: /lulab_backend/src/integrations/lark/lark.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { LarkClient } from './lark.client';
import { MinuteService } from './services';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';
import { LarkTesterService } from './lark.tester';

@Module({
  imports: [SystemConfigModule],
  providers: [
    LarkClient,
    MinuteService,
    LarkTesterService,
  ],
  exports: [
    LarkClient,
    MinuteService,
  ],
})
export class LarkModule {}
