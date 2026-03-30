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
import { RoleModule } from '@/role/role.module';
import { MeetAiModule } from '@/meet-ai/meet-ai.module';
import { ParticipantSummaryRepository } from '@/meet-ai/repositories';

import {
  GreetingTool,
  UserInfoTool,
  UserSearchTool,
  MeetingStatsTool,
} from './tools';
import {
  UserSearchRepository,
  MeetingStatsRepository,
  PlatformUserRepository,
} from './repositories';
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
    MeetAiModule,
  ],
  controllers: [SseController, StreamableHttpController],
  providers: [
    GreetingTool,
    UserInfoTool,
    UserSearchTool,
    MeetingStatsTool,
    UserSearchRepository,
    MeetingStatsRepository,
    PlatformUserRepository,
    ParticipantSummaryRepository,
  ],
})
export class McpServerModule {}
