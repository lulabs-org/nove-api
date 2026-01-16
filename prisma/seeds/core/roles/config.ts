/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:29:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 19:40:31
 * @FilePath: /nove_api/prisma/seeds/core/roles/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { RoleType } from '@prisma/client';
import type { RoleConfig } from './type';

export const REAL_ROLE_CONFIGS: RoleConfig[] = [
  {
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 0,
    type: RoleType.SYSTEM,
  },
  {
    code: 'ADMIN',
    name: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    level: 1,
    type: RoleType.SYSTEM,
  },
  {
    code: 'MANAGER',
    name: '经理',
    description: '部门经理，拥有部门管理权限',
    level: 2,
    type: RoleType.CUSTOM,
  },
  {
    code: 'FINANCE',
    name: '财务',
    description: '财务人员，拥有财务相关权限',
    level: 3,
    type: RoleType.CUSTOM,
  },
  {
    code: 'CUSTOMER_SERVICE',
    name: '客服',
    description: '客服人员，拥有客户服务权限',
    level: 4,
    type: RoleType.CUSTOM,
  },
  {
    code: 'USER',
    name: '普通用户',
    description: '普通用户，基础查看权限',
    level: 5,
    type: RoleType.CUSTOM,
  },
  {
    code: 'MEMBER',
    name: '会员',
    description: '会员用户，拥有更多权益和功能权限',
    level: 6,
    type: RoleType.CUSTOM,
  },
  {
    code: 'HEAD_TEACHER',
    name: '班主任',
    description: '班主任，负责班级管理和学员指导',
    level: 7,
    type: RoleType.CUSTOM,
  },
  {
    code: 'MENTOR',
    name: '师傅',
    description: '师傅，负责学员技能传授和指导',
    level: 8,
    type: RoleType.CUSTOM,
  },
];

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 0,
    type: RoleType.SYSTEM,
  },
  {
    code: 'ADMIN',
    name: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    level: 1,
    type: RoleType.SYSTEM,
  },
  {
    code: 'MANAGER',
    name: '经理',
    description: '部门经理，拥有部门管理权限',
    level: 2,
    type: RoleType.CUSTOM,
  },
  {
    code: 'FINANCE',
    name: '财务',
    description: '财务人员，拥有财务相关权限',
    level: 3,
    type: RoleType.CUSTOM,
  },
  {
    code: 'CUSTOMER_SERVICE',
    name: '客服',
    description: '客服人员，拥有客户服务权限',
    level: 4,
    type: RoleType.CUSTOM,
  },
  {
    code: 'USER',
    name: '普通用户',
    description: '普通用户，基础查看权限',
    level: 5,
    type: RoleType.CUSTOM,
  },
  {
    code: 'MEMBER',
    name: '会员',
    description: '会员用户，拥有更多权益和功能权限',
    level: 6,
    type: RoleType.CUSTOM,
  },
  {
    code: 'HEAD_TEACHER',
    name: '班主任',
    description: '班主任，负责班级管理和学员指导',
    level: 7,
    type: RoleType.CUSTOM,
  },
  {
    code: 'MENTOR',
    name: '师傅',
    description: '师傅，负责学员技能传授和指导',
    level: 8,
    type: RoleType.CUSTOM,
  },
];