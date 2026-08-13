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

export class CreateRecordingParticipantSummaryDto {
  @ApiProperty({ description: '平台用户 ID' })
  @IsString()
  platformUserId: string;

  @ApiProperty({ description: '参会人姓名快照' })
  @IsString()
  userName: string;

  @ApiProperty({ description: '总结正文' })
  @IsString()
  partSummary: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class UpdateRecordingParticipantSummaryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() userName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partSummary?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class QueryRecordingParticipantSummaryDto {
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

export class RecordingParticipantSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() meetingId: string;
  @ApiProperty() meetingRecordingId: string;
  @ApiProperty() platformUserId: string;
  @ApiPropertyOptional({ nullable: true }) meetingParticipantId: string | null;
  @ApiProperty() userName: string;
  @ApiProperty() partSummary: string;
  @ApiProperty({ type: [String] }) keywords: string[];
  @ApiProperty() version: number;
  @ApiProperty() isLatest: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class RecordingParticipantSummaryListResponseDto {
  @ApiProperty({ type: [RecordingParticipantSummaryDto] })
  data: RecordingParticipantSummaryDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
