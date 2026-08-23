import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  GenerationMethod,
  TargetTrackingReportType,
  TrackingReportCadence,
  TrackingSourceType,
  TrackingTargetType,
} from '@prisma/client';

export class TrackingTargetSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TrackingTargetType }) targetType: TrackingTargetType;
  @ApiProperty() targetId: string;
  @ApiProperty() nameSnapshot: string;
}

export class TrackingTargetDetailDto extends TrackingTargetSummaryDto {
  @ApiProperty({ type: Object }) metadata: Record<string, unknown>;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}

export class TrackingReportSourceDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TrackingSourceType }) sourceType: TrackingSourceType;
  @ApiProperty() sourceId: string;
  @ApiProperty({ type: Object }) metadata: Record<string, unknown>;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}

export class TrackingReportListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: TrackingTargetSummaryDto })
  target: TrackingTargetSummaryDto;
  @ApiProperty({ enum: TargetTrackingReportType })
  trackingType: TargetTrackingReportType;
  @ApiProperty({ enum: TrackingReportCadence }) cadence: TrackingReportCadence;
  @ApiPropertyOptional({ type: String, nullable: true })
  periodKey: string | null;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '周期开始时间（包含）',
  })
  periodStart: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: '下一周期开始时间（不包含）',
  })
  periodEnd: Date;
  @ApiProperty() timezone: string;
  @ApiPropertyOptional({ enum: GenerationMethod, nullable: true })
  generatedBy: GenerationMethod | null;
  @ApiPropertyOptional({ type: String, nullable: true }) aiModel: string | null;
  @ApiProperty() sourceCount: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}

export class TrackingReportDetailDto extends OmitType(
  TrackingReportListItemDto,
  ['target'] as const,
) {
  @ApiProperty({ type: TrackingTargetDetailDto })
  target: TrackingTargetDetailDto;
  @ApiProperty() content: string;
  @ApiProperty({ type: [TrackingReportSourceDto] })
  sources: TrackingReportSourceDto[];
}

export class TrackingReportListResponseDto {
  @ApiProperty({ type: [TrackingReportListItemDto] })
  data: TrackingReportListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
