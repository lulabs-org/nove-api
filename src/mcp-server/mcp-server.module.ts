/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:29:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-29 11:02:52
 * @FilePath: /lulab_backend/src/mcp-server/mcp-server.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { GreetingTool } from './tools/greeting.tool';
import { UserInfoTool } from './tools/user-info.tool';
import { MeetingStatsTool } from './tools/meeting-stats.tool';
import { Public } from '@/auth/decorators/public.decorator';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'lulab-mcp-server',
      version: '1.0.0',
      transport: [
        McpTransportType.SSE,
        McpTransportType.STREAMABLE_HTTP,
        McpTransportType.STDIO,
      ],
      sseEndpoint: 'sse',
      messagesEndpoint: 'messages',
      mcpEndpoint: 'mcp',
      decorators: [Public()],
      sse: {
        pingEnabled: true,
        pingIntervalMs: 30000,
      },
      streamableHttp: {
        enableJsonResponse: true,
        statelessMode: true,
      },
    }),
  ],
  providers: [GreetingTool, UserInfoTool, MeetingStatsTool],
})
export class McpServerModule {}
