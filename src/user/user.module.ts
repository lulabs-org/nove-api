/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 21:54:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 18:12:50
 * @FilePath: /lulab_backend/src/user/user.module.ts
 * @Description: 用户模块
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ProfileService } from './services/profile.service';
import { UserQueryRepository } from './repositories/user-query.repository';
import { UserCommandRepository } from './repositories/user-command.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [ProfileService, UserQueryRepository, UserCommandRepository],
  exports: [ProfileService, UserQueryRepository, UserCommandRepository],
})
export class UserModule {}
