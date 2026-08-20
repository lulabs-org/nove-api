/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:29:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:28:14
 * @FilePath: /nove_api/src/mcp-server/mcp-server.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { RoleModule } from '@/admin/role/role.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { MinuteParticipantSummaryRepository } from '@/meeting/repositories';

import {
  GreetingTool,
  UserInfoTool,
  UserSearchTool,
  MeetingStatsTool,
} from './tools';
import { MeetingStatsRepository, PlatformUserRepository } from './repositories';
import { UserModule } from '@/user/user.module';
import { SseController, StreamableHttpController } from './controllers';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'Nove-Mcp',
      version: '1.0.0',
      logging: {
        level: ['error', 'warn'], // Only show errors and warnings
      },
      transport: [],
      allowUnauthenticatedAccess: true,
      // decorators: [Public()],
      // guards: [McpAuthJwtGuard], // 保护所有 MCP 端点
    }),
    RoleModule,
    MeetingModule,
    UserModule,
  ],
  controllers: [SseController, StreamableHttpController],
  providers: [
    GreetingTool,
    UserInfoTool,
    UserSearchTool,
    MeetingStatsTool,
    MeetingStatsRepository,
    PlatformUserRepository,
    MinuteParticipantSummaryRepository,
  ],
})
export class McpServerModule {}
