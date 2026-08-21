import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMinuteParticipantSummaryDto {
  @ApiProperty({ description: '平台用户 ID' })
  @IsString()
  platformUserId: string;


  @ApiProperty({ description: '总结正文' })
  @IsString()
  partSummary: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class UpdateMinuteParticipantSummaryDto {

  @ApiPropertyOptional() @IsOptional() @IsString() partSummary?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class QueryMinuteParticipantSummaryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class MinuteParticipantSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() minuteId: string;
  @ApiProperty() platformUserId: string;

  @ApiProperty() partSummary: string;
  @ApiProperty({ type: [String] }) keywords: string[];
  @ApiProperty() version: number;
  @ApiProperty() isLatest: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class MinuteParticipantSummaryListResponseDto {
  @ApiProperty({ type: [MinuteParticipantSummaryDto] })
  data: MinuteParticipantSummaryDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class GenerateParticipantSummaryDto {
  @ApiPropertyOptional({
    description: '指定生成总结的部分平台用户ID (不传则生成所有发过言的用户)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'platformUserIds 必须是数组' })
  @IsString({ each: true, message: 'platformUserIds 数组必须包含字符串' })
  platformUserIds?: string[];
}
