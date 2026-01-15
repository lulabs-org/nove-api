/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-15 14:05:57
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 17:20:19
 * @FilePath: /nove_api/src/mcp-server/controllers/sse.controller.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Body,
  Controller,
  Get,
  Logger,
  OnModuleInit,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
  UseGuards,
} from '@nestjs/common';

import { McpSseService } from '@rekog/mcp-nest';
import { Public } from '@/auth/decorators/public.decorator';
import { McpAuthJwtGuard } from '@/api-key/guards/api-key-mcp-auth.guard';

/**
 * Advanced SSE Controller - Direct use of McpSseService
 * This controller demonstrates how to use McpSseService directly
 * instead of relying on the factory pattern
 */
@Controller({
  version: VERSION_NEUTRAL,
})
@Public()
@UseGuards(McpAuthJwtGuard)
export class SseController implements OnModuleInit {
  readonly logger = new Logger(SseController.name);

  constructor(public readonly mcpSseService: McpSseService) {}

  /**
   * Initialize the controller and configure SSE service
   */
  onModuleInit() {
    this.mcpSseService.initialize();
  }

  /**
   * SSE connection endpoint
   */
  @Get('/sse')
  async sse(@Req() rawReq: any, @Res() rawRes: any) {
    return this.mcpSseService.createSseConnection(
      rawReq,
      rawRes,
      'messages',
      '', // api prefix
    );
  }

  /**
   * Tool execution endpoint
   */
  @Post('/messages')
  async messages(
    @Req() rawReq: any,
    @Res() rawRes: any,
    @Body() body: unknown,
  ): Promise<void> {
    await this.mcpSseService.handleMessage(rawReq, rawRes, body);
  }
}
