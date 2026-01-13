import { PrismaClient, Curriculum, Project, Prisma } from '@prisma/client';
import { CURRICULUM_CONFIGS } from './config';
import type { CreateCurriculumsParams, CreatedCurriculums } from './type';

class CurriculumSeedError extends Error {
  constructor(
    message: string,
    public readonly context?: unknown,
  ) {
    super(message);
    this.name = 'CurriculumSeedError';
  }
}

function validateProjectReferences(
  projects: readonly Project[],
  configs: readonly { projectId: string }[],
): string[] {
  const projectIds = new Set(projects.map((p) => p.id));
  const missingIds: string[] = [];

  for (const config of configs) {
    if (!projectIds.has(config.projectId)) {
      missingIds.push(config.projectId);
    }
  }

  return missingIds;
}

function convertToPrismaInput(config: {
  id: string;
  projectId: string;
  title: string;
  description: string;
  week: number;
  topics: readonly string[];
  goals: readonly string[];
}): Prisma.CurriculumCreateInput {
  return {
    id: config.id,
    project: {
      connect: { id: config.projectId },
    },
    title: config.title,
    description: config.description,
    week: config.week,
    topics: config.topics as Prisma.InputJsonValue,
    goals: config.goals as Prisma.InputJsonValue,
  };
}

function logCurriculumCreation(curriculum: Curriculum): void {
  console.log(`✅ 创建课程: ${curriculum.title} (第${curriculum.week}周)`);
}

function logMissingProjects(missingIds: readonly string[]): void {
  if (missingIds.length > 0) {
    console.warn(
      `⚠️ 警告: 以下课程引用了不存在的项目ID: ${missingIds.join(', ')}`,
    );
  }
}

function logSummary(count: number): void {
  console.log(`📚 课程数据创建完成，共 ${count} 个课程`);
}

export async function createCurriculums(
  prisma: PrismaClient,
  { projects }: CreateCurriculumsParams,
): Promise<CreatedCurriculums> {
  console.log('📖 开始创建课程数据...');

  try {
    const missingProjectIds = validateProjectReferences(
      projects,
      CURRICULUM_CONFIGS,
    );
    logMissingProjects(missingProjectIds);

    const curriculumPromises = CURRICULUM_CONFIGS.map((config) => {
      const createInput = convertToPrismaInput(config);

      return prisma.curriculum.upsert({
        where: { id: config.id },
        update: createInput,
        create: createInput,
      });
    });

    const curriculums = await Promise.all(curriculumPromises);

    curriculums.forEach(logCurriculumCreation);
    logSummary(curriculums.length);

    return { curriculums };
  } catch (error) {
    console.error('❌ 创建课程数据失败:', error);
    throw new CurriculumSeedError('Failed to create curriculum data', error);
  }
}
