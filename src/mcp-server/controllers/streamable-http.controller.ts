/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-15 14:05:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 17:19:16
 * @FilePath: /nove_api/src/mcp-server/controllers/streamable-http.controller.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { McpStreamableHttpService } from '@rekog/mcp-nest';
import { Public } from '@/auth/decorators/public.decorator';
import { McpAuthJwtGuard } from '@/api-key/guards/api-key-mcp-auth.guard';

/**
 * Advanced Streamable HTTP Controller - Direct use of McpStreamableHttpService
 * This controller demonstrates how to use McpStreamableHttpService directly
 * instead of relying on the factory pattern
 */
@Controller()
@Public()
@UseGuards(McpAuthJwtGuard)
export class StreamableHttpController {
  public readonly logger = new Logger(StreamableHttpController.name);

  constructor(
    public readonly mcpStreamableHttpService: McpStreamableHttpService,
  ) {}

  /**
   * Main HTTP endpoint for both initialization and subsequent requests
   */
  @Post('/mcp')
  async handlePostRequest(
    @Req() req: any,
    @Res() res: any,
    @Body() body: unknown,
  ): Promise<void> {
    await this.mcpStreamableHttpService.handlePostRequest(req, res, body);
  }

  /**
   * GET endpoint for SSE streams - not supported in stateless mode
   */
  @Get('/mcp')
  async handleGetRequest(@Req() req: any, @Res() res: any): Promise<void> {
    await this.mcpStreamableHttpService.handleGetRequest(req, res);
  }

  /**
   * DELETE endpoint for terminating sessions - not supported in stateless mode
   */
  @Delete('/mcp')
  async handleDeleteRequest(@Req() req: any, @Res() res: any): Promise<void> {
    await this.mcpStreamableHttpService.handleDeleteRequest(req, res);
  }
}
