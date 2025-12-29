/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 10:29:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-29 10:33:05
 * @FilePath: /lulab_backend/src/mcp-server/mcp-server.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { GreetingTool } from './tools/greeting.tool';
import { UserInfoTool } from './tools/user-info.tool';
import { MeetingStatsTool } from './tools/meeting-stats.tool';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'lulab-mcp-server',
      version: '1.0.0',
    }),
  ],
  providers: [GreetingTool, UserInfoTool, MeetingStatsTool],
})
export class McpServerModule {}
