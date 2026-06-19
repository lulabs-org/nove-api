/*
 * @Author: LuLab-Team
 * @Date: 2026-06-17
 * @FilePath: /nove-api/src/meet-ai/controllers/period-summary.controller.ts
 * @Description: Controller for Period Summary triggers
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PeriodSummary } from '../services/period-summary.service';
import { TriggerSummaryDto } from '../dto/meet-ai.dto';

@ApiTags('Meet AI - Period Summary')
@Controller('meet-ai/period-summary')
export class PeriodSummaryController {
  constructor(private readonly periodSummaryService: PeriodSummary) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a period summary manually or by task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary processing initiated' })
  async processSummary(@Body() body: TriggerSummaryDto) {
    return await this.periodSummaryService.processSummary(body.periodType);
  }
}
