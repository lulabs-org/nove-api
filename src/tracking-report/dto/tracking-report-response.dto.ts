import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingCadence, TrackingReportType } from '@prisma/client';

export enum TrackingReportSubjectKind {
  LOCAL_USER = 'LOCAL_USER',
  PLATFORM_USER = 'PLATFORM_USER',
  PROJECT = 'PROJECT',
}

export class TrackingReportLocalUserDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) username: string | null;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) countryCode: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) displayName: string | null;
  @ApiPropertyOptional({ nullable: true }) avatar: string | null;
}

export class TrackingReportPlatformUserDto {
  @ApiProperty() id: string;
  @ApiProperty() platform: string;
  @ApiPropertyOptional({ nullable: true }) ptUserId: string | null;
  @ApiProperty() ptUnionId: string;
  @ApiPropertyOptional({ nullable: true }) displayName: string | null;
}

export class TrackingReportProjectDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) subtitle: string | null;
  @ApiPropertyOptional({ nullable: true }) category: string | null;
  @ApiPropertyOptional({ nullable: true }) image: string | null;
}

export class TrackingReportSubjectSummaryDto {
  @ApiProperty({ enum: TrackingReportSubjectKind })
  kind: TrackingReportSubjectKind;

  @ApiProperty() displayName: string;
  @ApiPropertyOptional({ nullable: true }) avatar: string | null;
  @ApiProperty({ description: '是否已关联本地用户' }) isLinked: boolean;
}

export class TrackingReportSubjectDto extends TrackingReportSubjectSummaryDto {
  @ApiProperty({ description: '生成报告时保留的历史名称快照' })
  nameSnapshot: string;
  @ApiPropertyOptional({ type: TrackingReportLocalUserDto, nullable: true })
  localUser: TrackingReportLocalUserDto | null;
  @ApiPropertyOptional({ type: TrackingReportPlatformUserDto, nullable: true })
  platformUser: TrackingReportPlatformUserDto | null;
  @ApiPropertyOptional({ type: TrackingReportProjectDto, nullable: true })
  project: TrackingReportProjectDto | null;
}

export class TrackingReportListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: TrackingReportSubjectSummaryDto })
  subject: TrackingReportSubjectSummaryDto;
  @ApiProperty({ enum: TrackingReportType }) trackingType: TrackingReportType;
  @ApiProperty({ enum: TrackingCadence }) cadence: TrackingCadence;
  @ApiProperty({ type: String, format: 'date-time' }) periodStart: Date;
  @ApiProperty({ type: String, format: 'date-time' }) periodEnd: Date;
  @ApiProperty() isLatest: boolean;
  @ApiProperty() version: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
}

export class TrackingReportListResponseDto {
  @ApiProperty({ type: [TrackingReportListItemDto] })
  data: TrackingReportListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class TrackingReportDetailDto extends TrackingReportListItemDto {
  @ApiProperty() timezone: string;
  @ApiProperty() content: string;
  @ApiPropertyOptional({ type: Object, nullable: true })
  structuredData: Record<string, unknown> | null;
  @ApiProperty() versionGroupKey: string;
  @ApiPropertyOptional({ nullable: true }) previousReportId: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}
