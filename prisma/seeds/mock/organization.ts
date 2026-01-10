/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-16 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-16 10:00:00
 * @FilePath: /lulab_backend/prisma/seeds/organization.ts
 * @Description: 组织数据种子模块 - 优化版本
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { PrismaClient, Organization } from '@prisma/client';

// ==================== 组织配置数据 ====================

/**
 * 组织配置数据
 */
const ORGANIZATION_CONFIG = {
  name: 'LuLab科技有限公司',
  code: 'LULAB',
  description: 'LuLab科技有限公司 - 专注于教育科技和在线学习平台',
} as const;

// ==================== 主函数 ====================

/**
 * 创建组织数据
 *
 * @param prisma - Prisma 客户端实例
 * @returns 创建的组织数据
 */
export async function createOrganization(
  prisma: PrismaClient,
): Promise<Organization> {
  console.log('🏢 开始创建组织数据...');

  try {
    // 创建或更新基础组织
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
