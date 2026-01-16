/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:30:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 19:46:04
 * @FilePath: /nove_api/prisma/seeds/permissions/permissions.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { PrismaClient, Permission } from '@prisma/client';
import { PERMISSION_CONFIGS, REAL_PERMISSION_CONFIGS } from './config';

export async function createPermissions(
  prisma: PrismaClient,
  useRealData = false,
): Promise<Permission[]> {
  const dataSource = useRealData ? '真实数据' : '模拟数据';
  console.log(`🔐 开始创建权限数据，使用${dataSource}...`);

  try {
    const permissionConfigs = useRealData
      ? REAL_PERMISSION_CONFIGS
      : PERMISSION_CONFIGS;
    const permissions: Permission[] = [];

    for (const permissionData of permissionConfigs) {
      const permission = await prisma.permission.upsert({
        where: { code: permissionData.code },
        update: {},
        create: permissionData,
      });
      permissions.push(permission);
      console.log(`✅ 创建权限: ${permission.name}`);
    }

    console.log(`🔑 权限数据创建完成，共 ${permissions.length} 个权限`);
    return permissions;
  } catch (error) {
    console.error('❌ 创建权限数据失败:', error);
    throw error;
  }
}
