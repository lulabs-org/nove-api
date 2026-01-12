import { PrismaClient } from '@prisma/client';
import { CreatedOrganization } from './type';
import { ORGANIZATION_CONFIG } from './config';

export async function createOrganization(
  prisma: PrismaClient,
): Promise<CreatedOrganization> {
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
    return { organization };
  } catch (error) {
    console.error('❌ 创建组织数据失败:', error);
    throw error;
  }
}
