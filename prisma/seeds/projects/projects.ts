/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 08:26:14
 * @FilePath: /nove_api/prisma/seeds/mock/projects/projects.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PROJECT_CONFIGS } from './config';
import type { CreatedProjects } from './type';

export async function createProjects(
  prisma: PrismaClient,
): Promise<CreatedProjects> {
  console.log('📚 开始创建项目数据...');

  try {
    const projectPromises = PROJECT_CONFIGS.map((config) => {
      const createInput: Prisma.ProjectUncheckedCreateInput = {
        id: config.id,
        title: config.title,
        subtitle: config.subtitle,
        category: config.category,
        image: config.image,
        duration: config.duration,
        level: config.level,
        maxStudents: config.maxStudents,
        description: config.description,
        slug: config.slug,
        prerequisites: config.prerequisites as unknown as Prisma.InputJsonValue,
        outcomes: config.outcomes as unknown as Prisma.InputJsonValue,
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
