/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:29:26
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 02:29:53
 * @FilePath: /nove_api/prisma/seeds/mock/core/roles/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Role, RoleType } from '@prisma/client';

export interface RoleConfig {
  key: keyof CreatedRoles;
  code: string;
  name: string;
  description: string;
  level: number;
  type: RoleType;
}

export interface CreatedRoles {
  superAdmin: Role;
  admin: Role;
  manager: Role;
  finance: Role;
  customerService: Role;
  user: Role;
}
