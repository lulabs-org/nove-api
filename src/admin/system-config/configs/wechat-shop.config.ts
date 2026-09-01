import { UpdateWechatShopConfigDto } from '../dto/wechat-shop-config.dto';
import { defineSystemConfig, environment } from './system-config.definition';

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
      environment: environment.string('WECHAT_SHOP_APP_SECRET', {
        trim: false,
      }),
    },
    webhookToken: {
      secret: true,
      environment: environment.string('WECHAT_SHOP_WEBHOOK_TOKEN', {
        trim: false,
      }),
    },
    encodingAesKey: {
      secret: true,
      environment: environment.string('WECHAT_SHOP_ENCODING_AES_KEY', {
        trim: false,
      }),
    },
    apiBaseUrl: {
      default: 'https://api.weixin.qq.com',
      environment: environment.custom(
        ['WECHAT_SHOP_API_BASE_URL', 'WECHAT_API_BASE_URL'],
        (values) =>
          (
            values.WECHAT_SHOP_API_BASE_URL ?? values.WECHAT_API_BASE_URL
          )?.trim(),
      ),
    },
  },
});
