import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  GenerationMethod,
  TargetTrackingReportType,
  TrackingReportCadence,
  TrackingSourceType,
  TrackingTargetType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TrackingReportSourceInputDto {
  @ApiProperty({ enum: TrackingSourceType })
  @IsEnum(TrackingSourceType)
  sourceType: TrackingSourceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiPropertyOptional({ type: Object, default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateTrackingReportDto {
  @ApiProperty({ enum: TrackingTargetType })
  @IsEnum(TrackingTargetType)
  targetType: TrackingTargetType;

  @ApiProperty({
    description: '业务对象 ID，例如用户、平台用户、项目或组织 ID',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: '追踪目标名称快照' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  targetName: string;

  @ApiPropertyOptional({ type: Object, default: {} })
  @IsOptional()
  @IsObject()
  targetMetadata?: Record<string, unknown>;

  @ApiProperty({ enum: TargetTrackingReportType })
  @IsEnum(TargetTrackingReportType)
  trackingType: TargetTrackingReportType;

  @ApiProperty({ enum: TrackingReportCadence })
  @IsEnum(TrackingReportCadence)
  cadence: TrackingReportCadence;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '用于定位所属周期的基准时间',
    example: '2026-08-23T10:00:00+08:00',
  })
  @Type(() => Date)
  @IsDate()
  baseDate: Date;

  @ApiPropertyOptional({
    default: 'Asia/Shanghai',
    description: '用于计算周期边界的 IANA 时区',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: GenerationMethod })
  @IsOptional()
  @IsEnum(GenerationMethod)
  generatedBy?: GenerationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiModel?: string;

  @ApiPropertyOptional({ type: [TrackingReportSourceInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackingReportSourceInputDto)
  sources?: TrackingReportSourceInputDto[];
}

class UpdateTrackingReportFieldsDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: GenerationMethod, nullable: true })
  @IsOptional()
  @IsEnum(GenerationMethod)
  generatedBy?: GenerationMethod | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  aiModel?: string | null;

  @ApiProperty({ type: [TrackingReportSourceInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackingReportSourceInputDto)
  sources: TrackingReportSourceInputDto[];
}

export class UpdateTrackingReportDto extends PartialType(
  UpdateTrackingReportFieldsDto,
) {}

export class QueryTrackingReportDto {
  @ApiPropertyOptional({ enum: TrackingTargetType })
  @IsOptional()
  @IsEnum(TrackingTargetType)
  targetType?: TrackingTargetType;

  @ApiPropertyOptional({ description: '业务对象 ID' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: '按目标名称模糊搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: TargetTrackingReportType })
  @IsOptional()
  @IsEnum(TargetTrackingReportType)
  trackingType?: TargetTrackingReportType;

  @ApiPropertyOptional({ enum: TrackingReportCadence })
  @IsOptional()
  @IsEnum(TrackingReportCadence)
  cadence?: TrackingReportCadence;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodStart?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodEnd?: Date;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
