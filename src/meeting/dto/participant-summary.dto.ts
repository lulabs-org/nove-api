import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDate,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodType } from '@prisma/client';

export class CreateParticipantSummaryDto {
  @ApiProperty({ description: '总结周期类型', enum: PeriodType })
  @IsEnum(PeriodType)
  periodType: PeriodType;

  @ApiPropertyOptional({ description: '平台用户ID' })
  @IsOptional()
  @IsString()
  platformUserId?: string;

  @ApiProperty({ description: '参会人名称' })
  @IsString()
  userName: string;

  @ApiProperty({ description: '总结内容' })
  @IsString()
  partSummary: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: '总结时间段开始' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  periodStart?: Date;

  @ApiPropertyOptional({ description: '总结时间段结束' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  periodEnd?: Date;
}

export class UpdateParticipantSummaryDto extends CreateParticipantSummaryDto {}

export class QueryParticipantSummaryDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '周期类型', enum: PeriodType })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @ApiPropertyOptional({ description: '平台用户ID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsString()
  platformUserId?: string;
}

export class ParticipantSummaryDto {
  @ApiProperty({ description: '总结ID' })
  id: string;

  @ApiProperty({ description: '总结周期类型', enum: PeriodType })
  periodType: PeriodType;

  @ApiPropertyOptional({ description: '平台用户ID' })
  platformUserId?: string;

  @ApiPropertyOptional({ description: '关联的会议ID' })
  meetingId?: string;

  @ApiPropertyOptional({ description: '关联的录制ID' })
  meetingRecordingId?: string;

  @ApiProperty({ description: '参会人名称' })
  userName: string;

  @ApiProperty({ description: '总结内容' })
  partSummary: string;

  @ApiPropertyOptional({ description: '关键词' })
  keywords?: string[];

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class ParticipantSummaryListResponseDto {
  @ApiProperty({ type: [ParticipantSummaryDto], description: '参会者总结列表' })
  data: ParticipantSummaryDto[];

  @ApiProperty({ description: '总条数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
