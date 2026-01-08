/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 02:33:59
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 02:47:28
 * @FilePath: /lulab_backend/src/permission/permission.module.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionService } from './services/permission.service';
import { PermissionRepository } from './repositories/permission.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionRepository, PermissionService],
  exports: [PermissionRepository, PermissionService],
})
export class PermissionModule {}
