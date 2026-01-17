/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:40:36
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 16:39:03
 * @FilePath: /nove_api/prisma/seeds/departments/departments.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { DEPARTMENT_CONFIGS } from './config';
import type { CreatedDepartments } from './type';

export async function createDepartments(
  prisma: PrismaClient,
  organizationId: string,
): Promise<CreatedDepartments> {
  console.log('🏬 开始创建部门数据...');

  try {
    for (const config of DEPARTMENT_CONFIGS) {
      let parentId: string | undefined;

      if (config.parentCode) {
        const parentDepartment = await prisma.dept.findUnique({
          where: { code: config.parentCode },
        });
        if (!parentDepartment) {
          throw new Error(`Parent department not found: ${config.parentCode}`);
        }
        parentId = parentDepartment.id;
      }

      const department = await prisma.dept.upsert({
        where: { code: config.code },
        update: {
          name: config.name,
          description: config.description,
          orgId: organizationId,
          parentId,
          level: config.level,
          sortOrder: config.sortOrder,
        },
        create: {
          code: config.code,
          name: config.name,
          description: config.description,
          orgId: organizationId,
          parentId,
          level: config.level,
          sortOrder: config.sortOrder,
        },
      });

      console.log(
        `✅ 创建部门: ${department.name}${parentId ? ` (隶属于 ${parentId ? parentId : '根部门'})` : ''}`,
      );
    }

    console.log(`🏢 部门数据创建完成，共 ${DEPARTMENT_CONFIGS.length} 个部门`);

    return await prisma.dept.findMany({
      where: { orgId: organizationId },
    });
  } catch (error) {
    console.error('❌ 创建部门数据失败:', error);
    throw error;
  }
}
