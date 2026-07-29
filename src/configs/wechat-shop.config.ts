import { registerAs, ConfigType } from '@nestjs/config';

export const wechatShopConfig = registerAs('wechatShop', () => ({
  appId: process.env.WECHAT_SHOP_APP_ID ?? '',
  appSecret: process.env.WECHAT_SHOP_APP_SECRET ?? '',
  webhookToken: process.env.WECHAT_SHOP_WEBHOOK_TOKEN ?? '',
  encodingAesKey: process.env.WECHAT_SHOP_ENCODING_AES_KEY ?? '',
  apiBaseUrl: process.env.WECHAT_API_BASE_URL ?? 'https://api.weixin.qq.com',
}));

export type WechatShopConfig = ConfigType<typeof wechatShopConfig>;
