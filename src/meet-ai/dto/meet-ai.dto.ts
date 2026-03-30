/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:01:43
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:06:36
 * @FilePath: /nove_api/src/meet-ai/dto/meet-ai.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeMeetingDto {
  @ApiProperty({ description: '会议ID' })
  @IsString()
  @IsNotEmpty()
  meetingId: string;
}

export class MeetingSummaryDto {
  @ApiProperty({ description: '会议ID' })
  meetingId: string;

  @ApiProperty({ description: '会议摘要' })
  summary: string;

  @ApiProperty({ description: '关键点', type: [String] })
  keyPoints: string[];

  @ApiProperty({ description: '行动项', type: [String] })
  actionItems: string[];
}
