import { IsString, IsOptional, IsUrl } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateWechatShopConfigDto {
  @IsOptional()
  @IsString()
  appId?: string;

  @IsString()
  @IsOptional()
  appSecret?: string;

  @IsString()
  @IsOptional()
  webhookToken?: string;

  @IsString()
  @IsOptional()
  encodingAesKey?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  apiBaseUrl?: string;
}

export const wechatShopConfig = defineIntegrationConfig(UpdateWechatShopConfigDto, {
  description: 'Organization Wechat Shop Configuration',
  defaults: {
    apiBaseUrl: 'https://api.weixin.qq.com',
  },
  required: ['appId', 'appSecret'],
  secrets: ['appSecret', 'webhookToken', 'encodingAesKey'],
});
