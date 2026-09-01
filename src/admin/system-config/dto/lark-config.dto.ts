import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLarkConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventEncryptKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventVerificationToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bitableAppToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingTableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingUserTableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingFileTableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalSummaryTableId?: string;
}
