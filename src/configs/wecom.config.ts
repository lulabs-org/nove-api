import { registerAs, ConfigType } from '@nestjs/config';

export const wecomConfig = registerAs('wecom', () => ({
  corpId: process.env.WECOM_CORP_ID ?? '',
  corpSecret: process.env.WECOM_CORP_SECRET ?? '',
  webhookToken: process.env.WECOM_TOKEN ?? '',
  encodingAesKey: process.env.WECOM_ENCODING_AES_KEY ?? '',
  apiBaseUrl: process.env.WECOM_API_BASE_URL ?? 'https://qyapi.weixin.qq.com',
}));

export type WecomConfig = ConfigType<typeof wecomConfig>;
