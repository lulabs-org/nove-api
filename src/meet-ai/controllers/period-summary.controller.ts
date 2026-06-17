/*
 * @Author: LuLab-Team
 * @Date: 2026-06-17
 * @FilePath: /nove-api/src/meet-ai/controllers/period-summary.controller.ts
 * @Description: Controller for Period Summary triggers
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PeriodType } from '@prisma/client';
import { PeriodSummary } from '../services/period-summary.service';

class TriggerSummaryDto {
  periodType!: PeriodType;
}

@ApiTags('Meet AI - Period Summary')
@Controller('meet-ai/period-summary')
export class PeriodSummaryController {
  constructor(private readonly periodSummaryService: PeriodSummary) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a period summary manually or by task' })
  async processSummary(@Body() body: TriggerSummaryDto) {
    if (!body.periodType) {
      return { ok: false, message: 'periodType is required' };
    }
    return await this.periodSummaryService.processSummary(body.periodType);
  }
}
