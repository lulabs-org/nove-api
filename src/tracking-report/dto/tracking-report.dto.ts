import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTrackingReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() subjectUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() platformUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiProperty() @IsString() subjectNameSnapshot: string;
  @ApiProperty({ enum: TrackingReportType })
  @IsEnum(TrackingReportType)
  trackingType: TrackingReportType;
  @ApiProperty({ enum: TrackingCadence })
  @IsEnum(TrackingCadence)
  cadence: TrackingCadence;
  @ApiProperty() @Type(() => Date) @IsDate() periodStart: Date;
  @ApiProperty() @Type(() => Date) @IsDate() periodEnd: Date;
  @ApiPropertyOptional({ default: 'Asia/Shanghai' })
  @IsOptional()
  @IsString()
  timezone?: string;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recordingSummaryIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceReportIds?: string[];
}

export class UpdateTrackingReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() subjectNameSnapshot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recordingSummaryIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceReportIds?: string[];
}

export class QueryTrackingReportDto {
  @IsOptional() @IsString() subjectUserId?: string;
  @IsOptional() @IsString() platformUserId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(TrackingReportType) trackingType?: TrackingReportType;
  @IsOptional() @IsEnum(TrackingCadence) cadence?: TrackingCadence;
  @IsOptional() @Type(() => Date) @IsDate() periodStart?: Date;
  @IsOptional() @Type(() => Date) @IsDate() periodEnd?: Date;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isLatest = true;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
