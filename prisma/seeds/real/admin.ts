import { PrismaClient, User, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const ADMIN_CONFIG = {
  email: 'admin@lulab.com',
  countryCode: '+86',
  phone: '13800138000',
  password: 'admin123',
  profile: {
    displayName: '系统管理员',
    firstName: '系统',
    lastName: '管理员',
    gender: 'PREFER_NOT_TO_SAY',
    bio: '系统管理员账户，负责系统整体管理和维护',
  },
} as const;

export interface CreatedAdmin {
  adminUser: User;
  adminRole: Role;
}

export async function createAdmin(prisma: PrismaClient): Promise<CreatedAdmin> {
  console.log('👤 创建管理员账户...');

  const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员角色，拥有所有权限',
      type: 'SYSTEM',
      level: 1,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_CONFIG.email },
    update: {},
    create: {
      email: ADMIN_CONFIG.email,
      countryCode: ADMIN_CONFIG.countryCode,
      phone: ADMIN_CONFIG.phone,
      passwordHash: hashedPassword,
      passwordAlgo: 'bcrypt',
      passwordSetAt: new Date(),
      active: true,
      profile: {
        create: ADMIN_CONFIG.profile,
      },
      roles: {
        connect: { id: adminRole.id },
      },
    },
    include: {
      profile: true,
      roles: true,
    },
  });

  console.log(`✅ 管理员账户创建完成: ${adminUser.email}`);

  return {
    adminUser,
    adminRole,
  };
}
