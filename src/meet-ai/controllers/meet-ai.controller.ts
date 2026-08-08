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
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NoPermissionRequired } from '@/permission/decorators/permissions.decorator';
import { ParticipantSummaryService } from '../services/participant-summary.service';
import { PeriodSummaryService } from '../services/period-summary.service';
import {
  TriggerSummaryDto,
  GenerateParticipantSummaryDto,
} from '../dto/meet-ai.dto';

@ApiTags('Meet AI')
@Controller('meet-ai')
@ApiBearerAuth()
@NoPermissionRequired()
export class MeetAiController {
  private readonly logger = new Logger(MeetAiController.name);

  constructor(
    private readonly participantSummaryService: ParticipantSummaryService,
    private readonly periodSummaryService: PeriodSummaryService,
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

  @Post('summaries/participant')
  @HttpCode(HttpStatus.OK)
  async generateParticipantSummary(@Body() dto: GenerateParticipantSummaryDto) {
    return {
      success: true,
      message: '参会者总结生成成功',
      data: await this.participantSummaryService.generateSummary(dto),
    };
  }

  @Post('summaries/period')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动或由定时任务触发周期性总结' })
  process(@Body() { periodType }: TriggerSummaryDto) {
    this.logger.log('触发周期性总结任务', { periodType });
    return this.periodSummaryService.process(periodType);
  }
}
