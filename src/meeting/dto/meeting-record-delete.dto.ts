/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-10 08:40:44
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-10 08:40:46
 * @FilePath: /nove_api/src/meeting/dto/meeting-record-delete.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import { MeetingRecordResponseDto } from './meeting-record-response.dto';

export class DeleteMeetingRecordResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '被删除的会议记录' })
  data: MeetingRecordResponseDto;

  @ApiProperty({ description: '删除时间' })
  deletedAt: Date;
}
