import { UpdateWechatShopConfigDto } from '../dto/wechat-shop-config.dto';
import { defineSystemConfig, environment } from '../core';

export const wechatShopConfig = defineSystemConfig(UpdateWechatShopConfigDto, {
  description: 'Organization Wechat Shop Configuration',
  fields: {
    appId: {
      required: true,
      environment: environment.string('WECHAT_SHOP_APP_ID'),
    },
    appSecret: {
      required: true,
      secret: true,
      environment: environment.string('WECHAT_SHOP_APP_SECRET'),
    },
    webhookToken: {
      secret: true,
      environment: environment.string('WECHAT_SHOP_WEBHOOK_TOKEN'),
    },
    encodingAesKey: {
      secret: true,
      environment: environment.string('WECHAT_SHOP_ENCODING_AES_KEY'),
    },
    apiBaseUrl: {
      default: 'https://api.weixin.qq.com',
      environment: environment.string('WECHAT_SHOP_API_BASE_URL'),
    },
  },
});
