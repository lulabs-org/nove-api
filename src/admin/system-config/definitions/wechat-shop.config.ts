import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { defineSystemConfig } from '../core';

export class UpdateWechatShopConfigDto {
  @ApiPropertyOptional({
    description: 'Wechat Shop App ID',
    example: 'wx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional({
    description: 'Wechat Shop App Secret (will be encrypted)',
  })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiPropertyOptional({ description: 'Webhook Token (will be encrypted)' })
  @IsString()
  @IsOptional()
  webhookToken?: string;

  @ApiPropertyOptional({ description: 'Encoding AES Key (will be encrypted)' })
  @IsString()
  @IsOptional()
  encodingAesKey?: string;

  @ApiPropertyOptional({
    description: 'API Base URL',
    example: 'https://api.weixin.qq.com',
  })
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  apiBaseUrl?: string;
}

export const wechatShopConfig = defineSystemConfig(UpdateWechatShopConfigDto, {
  description: 'Organization Wechat Shop Configuration',
  defaults: {
    apiBaseUrl: 'https://api.weixin.qq.com',
  },
  required: ['appId', 'appSecret'],
  secrets: ['appSecret', 'webhookToken', 'encodingAesKey'],
});
