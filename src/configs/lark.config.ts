/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-02 21:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-04 23:15:45
 * @FilePath: /lulab_backend/src/configs/lark.config.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { registerAs, ConfigType } from '@nestjs/config';

export const larkConfig = registerAs('lark', () => ({
  appId: process.env.LARK_APP_ID ?? '',
  appSecret: process.env.LARK_APP_SECRET ?? '',
  logLevel: (process.env.LARK_LOG_LEVEL ?? 'info') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error',
  baseUrl: process.env.LARK_BASE_URL ?? 'https://open.larksuite.com',
  event: {
    encryptKey: process.env.LARK_EVENT_ENCRYPT_KEY ?? '',
    verificationToken: process.env.LARK_EVENT_VERIFICATION_TOKEN ?? '',
  },
}));

export type LarkConfig = ConfigType<typeof larkConfig>;
