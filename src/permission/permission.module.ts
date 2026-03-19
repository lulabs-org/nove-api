/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 02:33:59
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 11:00:37
 * @FilePath: /nove_api/src/permission/permission.module.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermService } from './services/permission.service';
import { PermRepository, DataPermRepository } from './repositories';
import { PermissionController } from './controllers/permission.controller';
import { DataPermissionRuleController } from './controllers/data-permission-rule.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermRepository, DataPermRepository, PermService],
  controllers: [PermissionController, DataPermissionRuleController],
  exports: [PermRepository, DataPermRepository, PermService],
})
export class PermissionModule {}
