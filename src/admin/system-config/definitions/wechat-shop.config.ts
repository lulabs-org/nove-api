import { UpdateWechatShopConfigDto } from '../dto/wechat-shop-config.dto';
import { defineSystemConfig } from '../core';

export const wechatShopConfig = defineSystemConfig(UpdateWechatShopConfigDto, {
  description: 'Organization Wechat Shop Configuration',
  fields: {
    appId: {
      required: true,
    },
    appSecret: {
      required: true,
      secret: true,
    },
    webhookToken: {
      secret: true,
    },
    encodingAesKey: {
      secret: true,
    },
    apiBaseUrl: {
      default: 'https://api.weixin.qq.com',
    },
  },
});

