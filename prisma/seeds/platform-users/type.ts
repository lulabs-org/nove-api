/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:52:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 10:56:33
 * @FilePath: /nove_api/prisma/seeds/mock/platform-users/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Platform, Prisma } from '@prisma/client';

export type PlatformUserConfig = Omit<
  Prisma.PlatformUserUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'platform'
> & {
  platform: Platform;
};
