/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-16 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-16 10:00:00
 * @FilePath: /lulab_backend/prisma/seeds/projects.ts
 * @Description: 项目数据种子模块 - 优化版本
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { PrismaClient, Project, Prisma } from '@prisma/client';

// ==================== 类型定义 ====================

/**
 * 创建项目后返回的数据
 */
export interface CreatedProjects {
  projects: Project[];
}

/**
 * 项目配置数据类型
 */
interface ProjectConfig {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  image?: string;
  duration?: string;
  level?: string;
  maxStudents?: number;
  description?: string;
  slug?: string;
  prerequisites?: string[];
  outcomes?: string[];
}

// ==================== 项目配置数据 ====================

/**
 * 项目配置数据
 * 注意: prerequisites 和 outcomes 在存储时会转换为 JSON 格式
 */
const PROJECT_CONFIGS: ProjectConfig[] = [
  {
    id: 'proj_001',
    title: 'Python数据分析实战项目',
    subtitle: '从零开始学习Python数据分析，掌握核心技能',
    category: '数据分析',
    image: '/images/projects/python-data-analysis.svg',
    duration: '8周',
    level: '初级',
    maxStudents: 30,
    description:
      '本项目将带领学员从Python基础开始，逐步掌握数据分析的核心技能，包括数据清洗、可视化、统计分析等。通过真实案例练习，让学员能够独立完成数据分析项目。',
    slug: 'python-data-analysis',
    prerequisites: [
      '基本的计算机操作能力',
      '对数据分析有兴趣',
      '愿意投入时间学习',
    ],
    outcomes: [
      '掌握Python编程基础',
      '熟练使用pandas进行数据处理',
      '掌握matplotlib和seaborn数据可视化',
      '理解统计分析基本概念',
      '能够独立完成数据分析项目',
    ],
  },
  {
    id: 'proj_002',
    title: '机器学习算法实践',
    subtitle: '深入理解机器学习算法原理与应用',
    category: '机器学习',
    image: '/images/projects/machine-learning.svg',
    duration: '12周',
    level: '中级',
    maxStudents: 25,
    description:
      '深入学习机器学习的核心算法，包括监督学习、无监督学习和强化学习。通过理论讲解和实践项目，让学员掌握机器学习的精髓。',
    slug: 'machine-learning-practice',
    prerequisites: [
      'Python编程基础',
      '线性代数基础',
      '概率统计基础',
      '数据分析经验',
    ],
    outcomes: [
      '理解机器学习核心概念',
      '掌握常用机器学习算法',
      '熟练使用scikit-learn',
      '能够评估和优化模型',
      '完成端到端机器学习项目',
    ],
  },
  {
    id: 'proj_003',
    title: '深度学习与神经网络',
    subtitle: '探索人工智能的前沿技术',
    category: '深度学习',
    image: '/images/projects/deep-learning.svg',
    duration: '16周',
    level: '高级',
    maxStudents: 20,
    description:
      '深入学习深度学习和神经网络技术，包括CNN、RNN、Transformer等前沿架构。通过实际项目训练，掌握深度学习的核心技能。',
    slug: 'deep-learning-neural-networks',
    prerequisites: [
      '机器学习基础',
      'Python高级编程',
      '数学基础扎实',
      'GPU计算环境',
    ],
    outcomes: [
      '理解深度学习原理',
      '掌握TensorFlow/PyTorch',
      '能够设计神经网络架构',
      '完成计算机视觉项目',
      '完成自然语言处理项目',
    ],
  },
  {
    id: 'proj_004',
    title: 'Web全栈开发实战',
    subtitle: '从前端到后端的完整开发体验',
    category: 'Web开发',
    image: '/images/projects/fullstack-web.svg',
    duration: '10周',
    level: '中级',
    maxStudents: 35,
    description:
      '学习现代Web开发技术栈，包括React、Node.js、数据库设计等。通过构建完整的Web应用，掌握全栈开发技能。',
    slug: 'fullstack-web-development',
    prerequisites: [
      'HTML/CSS基础',
      'JavaScript基础',
      '基本的编程概念',
      '对Web开发有兴趣',
    ],
    outcomes: [
      '掌握React前端开发',
      '熟练使用Node.js后端开发',
      '理解数据库设计',
      '掌握API设计与开发',
      '完成全栈Web应用项目',
    ],
  },
  {
    id: 'proj_005',
    title: '移动应用开发',
    subtitle: '跨平台移动应用开发实践',
    category: '移动开发',
    image: '/images/projects/mobile-development.svg',
    duration: '12周',
    level: '中级',
    maxStudents: 25,
    description:
      '学习React Native跨平台移动应用开发，从基础组件到复杂应用架构，掌握移动应用开发的完整流程。',
    slug: 'mobile-app-development',
    prerequisites: [
      'JavaScript基础',
      'React基础',
      '移动设备使用经验',
      '对移动开发有兴趣',
    ],
    outcomes: [
      '掌握React Native开发',
      '理解移动应用架构',
      '熟练使用移动端API',
      '掌握应用发布流程',
      '完成跨平台移动应用',
    ],
  },
];

// ==================== 辅助函数 ====================

/**
 * 将项目配置转换为 Prisma 创建输入格式
 * prerequisites 和 outcomes 转换为 JSON 格式以符合 Prisma 模型定义
 */
function convertToProjectCreateInput(
  config: ProjectConfig,
): Prisma.ProjectUncheckedCreateInput {
  return {
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
}

// ==================== 主函数 ====================

/**
 * 创建项目数据
 *
 * @param prisma - Prisma 客户端实例
 * @returns 创建的项目数据
 */
export async function createProjects(
  prisma: PrismaClient,
): Promise<CreatedProjects> {
  console.log('📚 开始创建项目数据...');

  try {
    // 并行创建所有项目
    const projectPromises = PROJECT_CONFIGS.map((config) => {
      const createInput = convertToProjectCreateInput(config);

      return prisma.project.upsert({
        where: { id: config.id },
        update: createInput,
        create: createInput,
      });
    });

    const projects = await Promise.all(projectPromises);

    // 输出创建结果
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
