/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-08-30 00:53:00
 * @FilePath: /nove-api/prisma/seeds/projects/projects.ts
 * @Description: 项目种子数据生成
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PROJECT_CONFIGS } from './config';
import type { CreatedProjects } from './type';

export async function createProjects(
  prisma: PrismaClient,
  organizationId?: string,
): Promise<CreatedProjects> {
  console.log('📚 开始创建项目数据...');

  try {
    const targetOrgId =
      organizationId ??
      (
        await prisma.org.findFirst({
          where: { active: true, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      )?.id;
    if (!targetOrgId) {
      throw new Error('创建项目种子数据前必须先创建有效组织');
    }

    const projectPromises = PROJECT_CONFIGS.map((config) => {
      const createInput: Prisma.ProjectUncheckedCreateInput = {
        id: config.id,
        title: config.title,
        subtitle: config.subtitle,
        code: config.code,
        category: config.category,
        image: config.image,
        duration: config.duration,
        level: config.level,
        maxStudents: config.maxStudents,
        enrolledCount: config.enrolledCount ?? 0,
        status: config.status,
        sortOrder: config.sortOrder ?? 0,
        isFeatured: config.isFeatured ?? false,
        description: config.description,
        slug: config.slug,
        tags: config.tags ? [...config.tags] : [],
        prerequisites: config.prerequisites as unknown as Prisma.InputJsonValue,
        outcomes: config.outcomes as unknown as Prisma.InputJsonValue,
        orgId: targetOrgId,
      };

      return prisma.project.upsert({
        where: { id: config.id },
        update: createInput,
        create: createInput,
      });
    });

    const projects = await Promise.all(projectPromises);

    projects.forEach((project) => {
      console.log(`✅ 创建项目: ${project.title}`);
    });

    console.log(`🎯 项目数据创建完成，共 ${projects.length} 个项目`);
    return { projects };
  } catch (error) {
    console.error('❌ 创建项目数据失败:', error);
    throw error;
  }
}
