/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:03:38
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-01 06:03:39
 * @FilePath: /lulab_backend/src/configs/aliyun.config.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { registerAs, ConfigType } from '@nestjs/config';

export const aliyunConfig = registerAs('aliyun', () => ({
  sms: {
    signName: process.env.ALIYUN_SMS_SIGN_NAME ?? '视算新里程科技',
    templates: {
      register: process.env.ALIYUN_SMS_TEMPLATE_REGISTER ?? 'SMS_271525576',
      login: process.env.ALIYUN_SMS_TEMPLATE_LOGIN ?? 'SMS_271525576',
      resetPassword: process.env.ALIYUN_SMS_TEMPLATE_RESET ?? 'SMS_271525576',
      securityChange: process.env.ALIYUN_SMS_TEMPLATE_SECURITY_CHANGE ?? '',
    },
  },
}));

export type AliyunConfig = ConfigType<typeof aliyunConfig>;
