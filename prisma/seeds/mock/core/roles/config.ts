/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:29:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:37:19
 * @FilePath: /nove_api/prisma/seeds/mock/core/roles/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { RoleType } from '@prisma/client';
import type { RoleConfig } from './type';

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'superAdmin',
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 0,
    type: RoleType.SYSTEM,
  },
  {
    key: 'admin',
    code: 'ADMIN',
    name: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    level: 1,
    type: RoleType.SYSTEM,
  },
  {
    key: 'manager',
    code: 'MANAGER',
    name: '经理',
    description: '部门经理，拥有部门管理权限',
    level: 2,
    type: RoleType.CUSTOM,
  },
  {
    key: 'finance',
    code: 'FINANCE',
    name: '财务',
    description: '财务人员，拥有财务相关权限',
    level: 3,
    type: RoleType.CUSTOM,
  },
  {
    key: 'customerService',
    code: 'CUSTOMER_SERVICE',
    name: '客服',
    description: '客服人员，拥有客户服务权限',
    level: 4,
    type: RoleType.CUSTOM,
  },
  {
    key: 'user',
    code: 'USER',
    name: '普通用户',
    description: '普通用户，基础查看权限',
    level: 5,
    type: RoleType.CUSTOM,
  },
];
