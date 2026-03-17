/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-17 12:31:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-17 16:39:41
 * @FilePath: /nove_api/src/tencent-mtg/dto/sync-meeting-detail.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncMeetingDetailDto {
  @ApiProperty({
    description: '会议ID',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  meetingId: string;

  @ApiProperty({
    description: '子会议ID（可选，用于周期性会议）',
    example: '1',
    required: false,
  })
  @IsString()
  @IsOptional()
  subMeetingId?: string;

  @ApiProperty({
    description: '用户ID（可选，如果未提供则使用配置中的默认用户）',
    example: 'user123',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class SyncMeetingDetailResponseDto {
  @ApiProperty({
    description: '会议ID',
    example: '123456789',
  })
  meetingId: string;

  @ApiProperty({
    description: '子会议ID',
    example: '1',
  })
  subMeetingId: string;

  @ApiProperty({
    description: '会议标题',
    example: '项目周会',
  })
  title: string;

  @ApiProperty({
    description: '是否成功同步',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '同步时间',
    example: '2026-03-17T10:00:00.000Z',
  })
  syncedAt: string;

  @ApiProperty({
    description: '消息',
    example: '会议详情同步成功',
  })
  message: string;
}
