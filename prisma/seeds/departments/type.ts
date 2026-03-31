/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:30:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 17:18:25
 * @FilePath: /nove_api/prisma/seeds/departments/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Dept } from '@prisma/client';

export interface DepartmentConfig {
  code: string;
  name: string;
  description: string;
  level: number;
  sortOrder: number;
  parentCode?: string;
}

export type CreatedDepartments = Dept[];
