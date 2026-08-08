import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDate,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
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
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @ApiPropertyOptional({ description: '平台用户ID' })
  @IsOptional()
  @IsString()
  platformUserId?: string;
}
