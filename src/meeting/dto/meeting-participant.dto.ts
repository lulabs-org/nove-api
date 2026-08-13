import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMeetingParticipantsDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: '按姓名、邮箱、手机号或平台用户 ID 搜索',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class MeetingParticipantUserDto {
  @ApiProperty({ description: '平台用户 ID' })
  id: string;

  @ApiProperty({ description: '平台', enum: Platform })
  platform: Platform;

  @ApiPropertyOptional({ description: '平台侧用户 ID', nullable: true })
  ptUserId: string | null;

  @ApiPropertyOptional({ description: '显示名称', nullable: true })
  displayName: string | null;

  @ApiPropertyOptional({ description: '头像', nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ description: '邮箱', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: '国家代码', nullable: true })
  countryCode: string | null;

  @ApiPropertyOptional({ description: '手机号', nullable: true })
  phone: string | null;
}

export class MeetingParticipantDto {
  @ApiProperty({ description: '参会记录 ID' })
  id: string;

  @ApiProperty({ description: '会议 ID' })
  meetingId: string;

  @ApiPropertyOptional({ description: '平台用户记录 ID', nullable: true })
  ptUserId: string | null;

  @ApiPropertyOptional({ description: '首次入会时间', nullable: true })
  firstJoinTime: Date | null;

  @ApiPropertyOptional({ description: '最后离会时间', nullable: true })
  lastLeaveTime: Date | null;

  @ApiPropertyOptional({ description: '累计参会时长（秒）', nullable: true })
  totalDurationSeconds: number | null;

  @ApiPropertyOptional({ type: MeetingParticipantUserDto, nullable: true })
  user: MeetingParticipantUserDto | null;
}

export class MeetingParticipantListResponseDto {
  @ApiProperty({ type: [MeetingParticipantDto] })
  data: MeetingParticipantDto[];

  @ApiProperty({ description: '成员总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
