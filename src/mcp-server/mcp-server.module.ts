/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:29:37
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-03-18 22:43:34
 * @FilePath: /nove-api/src/mcp-server/mcp-server.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { GreetingTool } from './tools/greeting.tool';
import { UserInfoTool } from './tools/user-info.tool';
import { UserSearchTool } from './tools/userid-search.tool';
import { MeetingStatsTool } from './tools/meeting-stats.tool';
import { UserSearchRepository } from './repositories/userid-search.repository';
import { MeetingStatsRepository } from './repositories/meeting-stats.repository';
import { PlatformUserRepository } from './repositories/platform-user.repository';
import { ParticipantSummaryRepository } from './repositories/participant-summary.repository';
import { SseController } from './controllers/sse.controller';
import { StreamableHttpController } from './controllers/streamable-http.controller';
import { PeriodSummaryTool } from './tools/period-summary.tool';
import { PeriodSummaryRepository } from './repositories/period-summary.respository';

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
    ParticipantSummaryRepository,
  ],
})
export class McpServerModule {}
