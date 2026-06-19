/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:12:36
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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NoPermissionRequired } from '@/permission/decorators/permissions.decorator';
import { MeetAiService } from '../services/meet-ai.service';
import { PeriodSummary } from '../services/period-summary.service';
import { TriggerSummaryDto } from '../dto/meet-ai.dto';

@ApiTags('Meet AI')
@Controller('meet-ai')
@ApiBearerAuth()
@NoPermissionRequired()
export class MeetAiController {
  private readonly logger = new Logger(MeetAiController.name);

  constructor(
    private readonly meetAiService: MeetAiService,
    private readonly periodSummaryService: PeriodSummary,
  ) {}

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
  analyzeMeeting(@Body(new ValidationPipe()) body: { meetingId: string }) {
    this.logger.log('分析会议', { meetingId: body.meetingId });
    return this.meetAiService.analyzeMeeting(body.meetingId);
  }

  @Get(':meetingId/summary')
  @HttpCode(HttpStatus.OK)
  getMeetingSummary(@Param('meetingId') meetingId: string) {
    this.logger.log('获取会议摘要', { meetingId });
    return this.meetAiService.getMeetingSummary(meetingId);
  }

  @Post('participant-summary')
  @HttpCode(HttpStatus.OK)
  async generateParticipantSummary(
    @Body(new ValidationPipe())
    body: {
      recordId: string;
      platformUserId: string;
    },
  ) {
    this.logger.log('生成参会者总结', {
      recordId: body.recordId,
      platformUserId: body.platformUserId,
    });
    return this.meetAiService.generateParticipantSummary(
      body.recordId,
      body.platformUserId,
    );
  }

  @Post('period-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a period summary manually or by task' })
  @ApiBody({ type: TriggerSummaryDto, description: '触发总结任务所需的参数' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary processing initiated' })
  async processSummary(@Body() body: TriggerSummaryDto) {
    this.logger.log('触发周期性总结任务', { periodType: body.periodType });
    return await this.periodSummaryService.processSummary(body.periodType);
  }
}
