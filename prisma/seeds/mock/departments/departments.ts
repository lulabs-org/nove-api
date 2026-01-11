import { PrismaClient, Department } from '@prisma/client';
import { CreatedDepartments, DEPARTMENT_CONFIGS } from './config';

export async function createDepartments(
  prisma: PrismaClient,
  organizationId: string,
): Promise<CreatedDepartments> {
  console.log('🏬 开始创建部门数据...');

  try {
    const departmentMap = new Map<string, Department>();

    const level1Configs = DEPARTMENT_CONFIGS.filter(
      (config) => !config.parentCode,
    );
    const level1Promises = level1Configs.map(async (config) => {
      const department = await prisma.department.upsert({
        where: { code: config.code },
        update: {
          name: config.name,
          description: config.description,
          organizationId,
          level: config.level,
          sortOrder: config.sortOrder,
        },
        create: {
          code: config.code,
          name: config.name,
          description: config.description,
          organizationId,
          level: config.level,
          sortOrder: config.sortOrder,
        },
      });

      departmentMap.set(config.code, department);
      console.log(`✅ 创建一级部门: ${department.name}`);
      return department;
    });

    await Promise.all(level1Promises);

    const level2Configs = DEPARTMENT_CONFIGS.filter(
      (config) => config.parentCode,
    );
    const level2Promises = level2Configs.map(async (config) => {
      const parentDepartment = departmentMap.get(config.parentCode!);
      if (!parentDepartment) {
        throw new Error(`Parent department not found: ${config.parentCode}`);
      }

      const department = await prisma.department.upsert({
        where: { code: config.code },
        update: {
          name: config.name,
          description: config.description,
          organizationId,
          parentId: parentDepartment.id,
          level: config.level,
          sortOrder: config.sortOrder,
        },
        create: {
          code: config.code,
          name: config.name,
          description: config.description,
          organizationId,
          parentId: parentDepartment.id,
          level: config.level,
          sortOrder: config.sortOrder,
        },
      });

      departmentMap.set(config.code, department);
      console.log(
        `✅ 创建二级部门: ${department.name} (隶属于 ${parentDepartment.name})`,
      );
      return department;
    });

    await Promise.all(level2Promises);

    console.log(`🏢 部门数据创建完成，共 ${departmentMap.size} 个部门`);

    return {
      tech: departmentMap.get('TECH')!,
      sales: departmentMap.get('SALES')!,
      finance: departmentMap.get('FINANCE')!,
      hr: departmentMap.get('HR')!,
      customerService: departmentMap.get('CUSTOMER_SERVICE')!,
      techDev: departmentMap.get('TECH_DEV')!,
      techOps: departmentMap.get('TECH_OPS')!,
      salesDirect: departmentMap.get('SALES_DIRECT')!,
      salesChannel: departmentMap.get('SALES_CHANNEL')!,
    };
  } catch (error) {
    console.error('❌ 创建部门数据失败:', error);
    throw error;
  }
}
