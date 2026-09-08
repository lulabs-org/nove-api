import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { defineSystemConfig } from '../core';

export class UpdateTencentMeetingConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sdkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encodingAesKey?: string;
}

export const tencentMeetingConfig = defineSystemConfig(
  UpdateTencentMeetingConfigDto,
  {
    description: 'Organization Tencent Meeting Configuration',
    required: ['appId', 'sdkId', 'secretId', 'secretKey', 'userId'],
    secrets: ['secretId', 'secretKey', 'webhookToken', 'encodingAesKey'],
  },
);
