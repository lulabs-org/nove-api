import { IsOptional, IsString, IsUrl } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateWecomConfigDto {
  @IsOptional()
  @IsString()
  corpId?: string;

  @IsOptional()
  @IsString()
  corpSecret?: string;

  @IsOptional()
  @IsString()
  webhookToken?: string;

  @IsOptional()
  @IsString()
  encodingAesKey?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  apiBaseUrl?: string;
}

export const wecomConfig = defineIntegrationConfig(UpdateWecomConfigDto, {
  description: 'Enterprise WeChat (WeCom) Integration Configuration',
  defaults: {
    apiBaseUrl: 'https://qyapi.weixin.qq.com',
  },
  required: ['corpId', 'corpSecret'],
  secrets: ['corpSecret', 'webhookToken', 'encodingAesKey'],
});
