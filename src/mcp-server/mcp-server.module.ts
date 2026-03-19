/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:29:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 21:09:45
 * @FilePath: /nove_api/src/mcp-server/mcp-server.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { RoleModule } from '@/role/role.module';
import {
  GreetingTool,
  UserInfoTool,
  UserSearchTool,
  MeetingStatsTool,
} from './tools';
import {
  UserSearchRepository,
  MeetingStatsRepository,
  PeriodSummaryRepository,
  PlatformUserRepository,
  ParticipantSummaryRepository,
} from './repositories';
import { SseController, StreamableHttpController } from './controllers';
import { PeriodSummaryTool } from './tools/period-summary.tool';

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
  ],
  controllers: [SseController, StreamableHttpController],
  providers: [
    GreetingTool,
    UserInfoTool,
    PeriodSummaryTool,
    UserSearchTool,
    MeetingStatsTool,
    UserSearchRepository,
    MeetingStatsRepository,
    PeriodSummaryRepository,
    PlatformUserRepository,
    ParticipantSummaryRepository
  ],
})
export class McpServerModule {}
