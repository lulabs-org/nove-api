/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 12:44:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 13:58:46
 * @FilePath: /lulab_backend/prisma/seeds/mock/core/organization/organization.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, Organization } from '@prisma/client';
import { ORGANIZATION_CONFIG } from './config';

export async function createOrganization(
  prisma: PrismaClient,
): Promise<Organization> {
  console.log('🏢 开始创建组织数据...');

  try {
    const organization = await prisma.organization.upsert({
      where: { code: ORGANIZATION_CONFIG.code },
      update: {
        name: ORGANIZATION_CONFIG.name,
        description: ORGANIZATION_CONFIG.description,
      },
      create: ORGANIZATION_CONFIG,
    });

    console.log(`✅ 创建/更新组织: ${organization.name}`);
    return organization;
  } catch (error) {
    console.error('❌ 创建组织数据失败:', error);
    throw error;
  }
}
