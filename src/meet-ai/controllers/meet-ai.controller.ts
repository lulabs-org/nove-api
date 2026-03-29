/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:06:09
 * @FilePath: /nove_api/src/meet-ai/controllers/meet-ai.controller.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MeetAiService } from '../services/meet-ai.service';

@ApiTags('Meet AI')
@Controller('meet-ai')
@ApiBearerAuth()
export class MeetAiController {
  private readonly logger = new Logger(MeetAiController.name);

  constructor(private readonly meetAiService: MeetAiService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'meet-ai-service',
    };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeMeeting(
    @Body(new ValidationPipe()) body: { meetingId: string },
  ) {
    this.logger.log('分析会议', { meetingId: body.meetingId });
    return this.meetAiService.analyzeMeeting(body.meetingId);
  }

  @Get(':meetingId/summary')
  @HttpCode(HttpStatus.OK)
  async getMeetingSummary(@Param('meetingId') meetingId: string) {
    this.logger.log('获取会议摘要', { meetingId });
    return this.meetAiService.getMeetingSummary(meetingId);
  }
}
