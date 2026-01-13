/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:51:27
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 11:05:06
 * @FilePath: /lulab_backend/prisma/seeds/mock/users/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { $Enums } from '@prisma/client';

export const PASSWORDS = {
  ADMIN: 'admin123',
  USER: 'user123',
} as const;

export const COUNTRY_CODE = '+86' as const;
export const COUNTRY = '中国' as const;

export const USERS_REAL = [
  {
    email: 'admin@lulabs.com',
    phone: '13800138000',
    password: PASSWORDS.ADMIN,
    profile: {
      displayName: '系统管理员',
      firstName: '系统',
      lastName: '管理员',
      gender: $Enums.Gender.PREFER_NOT_TO_SAY,
      bio: '系统管理员账户，负责系统整体管理和维护',
    },
  },
  {
    email: 'finance@lulabs.com',
    phone: '13800138001',
    password: PASSWORDS.ADMIN,
    profile: {
      displayName: '财务专员',
      firstName: '财务',
      lastName: '专员',
      gender: $Enums.Gender.FEMALE,
      bio: '负责公司财务管理和账务处理',
      city: '北京',
      country: COUNTRY,
    },
  },
] as const;

export const USERS_MOCK = [
  {
    email: 'admin@lulabs.com',
    phone: '13800138000',
    password: PASSWORDS.ADMIN,
    profile: {
      displayName: '系统管理员',
      firstName: '系统',
      lastName: '管理员',
      gender: $Enums.Gender.PREFER_NOT_TO_SAY,
      bio: '系统管理员账户，负责系统整体管理和维护',
    },
  },
  {
    email: 'finance@lulabs.com',
    phone: '13800138001',
    password: PASSWORDS.ADMIN,
    profile: {
      displayName: '财务专员',
      firstName: '财务',
      lastName: '专员',
      gender: $Enums.Gender.FEMALE,
      bio: '负责公司财务管理和账务处理',
      city: '北京',
      country: COUNTRY,
    },
  },
  {
    email: 'service@lulabs.com',
    phone: '13800138002',
    password: PASSWORDS.ADMIN,
    profile: {
      displayName: '客服专员',
      firstName: '客服',
      lastName: '专员',
      gender: $Enums.Gender.FEMALE,
      bio: '负责客户服务和问题解答',
      city: '上海',
      country: COUNTRY,
    },
  },
  {
    email: 'user1@example.com',
    phone: '13800138003',
    password: PASSWORDS.USER,
    profile: {
      displayName: '张三',
      firstName: '三',
      lastName: '张',
      gender: $Enums.Gender.MALE,
      city: '北京',
      country: COUNTRY,
      bio: '软件工程师，热爱编程',
      dateOfBirth: new Date(1991, 1, 6),
    },
  },
  {
    email: 'user2@example.com',
    phone: '13800138004',
    password: PASSWORDS.USER,
    profile: {
      displayName: '李四',
      firstName: '四',
      lastName: '李',
      gender: $Enums.Gender.FEMALE,
      city: '上海',
      country: COUNTRY,
      bio: '产品经理，关注用户体验',
      dateOfBirth: new Date(1992, 2, 11),
    },
  },
  {
    email: 'user3@example.com',
    phone: '13800138005',
    password: PASSWORDS.USER,
    profile: {
      displayName: '王五',
      firstName: '五',
      lastName: '王',
      gender: $Enums.Gender.MALE,
      city: '广州',
      country: COUNTRY,
      bio: '数据分析师，擅长数据挖掘',
      dateOfBirth: new Date(1993, 3, 16),
    },
  },
  {
    email: 'user4@example.com',
    phone: '13800138006',
    password: PASSWORDS.USER,
    profile: {
      displayName: '赵六',
      firstName: '六',
      lastName: '赵',
      gender: $Enums.Gender.FEMALE,
      city: '深圳',
      country: COUNTRY,
      bio: 'UI设计师，追求美感',
      dateOfBirth: new Date(1994, 4, 21),
    },
  },
  {
    email: 'user5@example.com',
    phone: '13800138007',
    password: PASSWORDS.USER,
    profile: {
      displayName: '钱七',
      firstName: '七',
      lastName: '钱',
      gender: $Enums.Gender.OTHER,
      city: '杭州',
      country: COUNTRY,
      bio: '市场专员，善于沟通',
      dateOfBirth: new Date(1995, 5, 26),
    },
  },
] as const;
