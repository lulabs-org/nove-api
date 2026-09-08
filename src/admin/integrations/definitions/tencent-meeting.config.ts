import { IsOptional, IsString } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateTencentMeetingConfigDto {
  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsString()
  sdkId?: string;

  @IsOptional()
  @IsString()
  secretId?: string;

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  webhookToken?: string;

  @IsOptional()
  @IsString()
  encodingAesKey?: string;
}

export const tencentMeetingConfig = defineIntegrationConfig(
  UpdateTencentMeetingConfigDto,
  {
    description: 'Organization Tencent Meeting Configuration',
    required: ['appId', 'sdkId', 'secretId', 'secretKey', 'userId'],
    secrets: ['secretId', 'secretKey', 'webhookToken', 'encodingAesKey'],
  },
);
