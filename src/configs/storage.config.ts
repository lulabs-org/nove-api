/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 16:09:46
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 16:10:30
 * @FilePath: /nove_api/src/configs/storage.config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { registerAs, ConfigType } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  oss: {
    region: process.env.OSS_REGION ?? 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
    bucket: process.env.OSS_BUCKET ?? '',
  },
}));

export type StorageConfig = ConfigType<typeof storageConfig>;
