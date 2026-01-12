/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:40:20
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 08:25:27
 * @FilePath: /nove_api/prisma/seeds/mock/departments/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import type { DepartmentConfig } from './type';

export const DEPARTMENT_CONFIGS: DepartmentConfig[] = [
  {
    code: 'TECH',
    name: '技术部',
    description: '负责技术研发和系统维护',
    level: 1,
    sortOrder: 1,
  },
  {
    code: 'SALES',
    name: '销售部',
    description: '负责产品销售和市场推广',
    level: 1,
    sortOrder: 2,
  },
  {
    code: 'FINANCE',
    name: '财务部',
    description: '负责财务管理和会计核算',
    level: 1,
    sortOrder: 3,
  },
  {
    code: 'HR',
    name: '人力资源部',
    description: '负责人力资源管理和招聘',
    level: 1,
    sortOrder: 4,
  },
  {
    code: 'CUSTOMER_SERVICE',
    name: '客服部',
    description: '负责客户服务和售后支持',
    level: 1,
    sortOrder: 5,
  },
  {
    code: 'TECH_DEV',
    name: '研发组',
    description: '负责产品研发和功能开发',
    level: 2,
    sortOrder: 1,
    parentCode: 'TECH',
  },
  {
    code: 'TECH_OPS',
    name: '运维组',
    description: '负责系统运维和基础设施管理',
    level: 2,
    sortOrder: 2,
    parentCode: 'TECH',
  },
  {
    code: 'SALES_DIRECT',
    name: '直销组',
    description: '负责直接客户销售',
    level: 2,
    sortOrder: 1,
    parentCode: 'SALES',
  },
  {
    code: 'SALES_CHANNEL',
    name: '渠道组',
    description: '负责渠道合作和代理商管理',
    level: 2,
    sortOrder: 2,
    parentCode: 'SALES',
  },
];
