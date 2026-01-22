/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 12:44:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-22 19:52:18
 * @FilePath: /nove_api/prisma/seeds/core/roles/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { RoleType } from '@prisma/client';

export interface RoleConfig {
  orgId: string;
  code: string;
  name: string;
  description: string;
  level: number;
  type: RoleType;
  active?: boolean;
}
