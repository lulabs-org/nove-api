/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 00:39:44
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-22 19:52:47
 * @FilePath: /nove_api/prisma/seed-utils/database-seed.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import type { SeedMode } from './types';
import * as seedFunctions from '../seeds/index';

const log = (message: string) => console.log(message);

export async function seedDatabase(
  prisma: PrismaClient,
  mode: SeedMode = 'mock',
): Promise<void> {
  log(`🚀 开始数据库种子数据初始化 (${mode} 模式)...`);

  try {
    await (mode === 'real' ? seedRealDatabase : seedMockDatabase)(prisma);
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  }
}

async function seedRealDatabase(prisma: PrismaClient): Promise<void> {
  log('\n🏢 步骤 1: 创建组织');
  const organization = await seedFunctions.createOrganization(prisma, true);

  log('  2 创建权限');
  const permissions = await seedFunctions.createPermissions(prisma, true);

  log('  2: 创建角色');
  const roles = await seedFunctions.createRoles(prisma, true, organization.id);

  log(`\n🏢 organization: ${organization.name}`);
  log(
    `\n🏢 permissions: ${permissions.map((permission) => permission.name).join(', ')}`,
  );
  log(`\n🏢 roles: ${roles.map((role) => role.name).join(', ')}`);
}

async function seedMockDatabase(prisma: PrismaClient): Promise<void> {
  log('\n🏢 步骤 1: 创建组织');
  const organization = await seedFunctions.createOrganization(prisma);

  log('\n🏬 步骤 2: 创建部门结构');
  const departments = await seedFunctions.createDepartments(
    prisma,
    organization.id,
  );

  log('\n🔐 步骤 3: 创建权限体系');

  log('  3.1 创建权限');
  const permissions = await seedFunctions.createPermissions(prisma);

  log('  3.2 创建角色');
  const roles = await seedFunctions.createRoles(prisma, false, organization.id);

  log('  3.3 分配角色权限');
  await seedFunctions.assignRolePermissions(prisma, permissions, roles);

  log('\n👥 步骤 4: 创建用户');
  const userData = await seedFunctions.createUsers(prisma);

  log('\n🔗 步骤 5: 创建用户组织关联');
  await seedFunctions.createUserOrganizationRelations(
    prisma,
    organization.id,
    userData,
  );

  log('\n🎭 步骤 6: 为用户分配角色');
  await seedFunctions.assignUserRoles(prisma, userData, roles);

  log('\n🔗 步骤 7: 创建用户部门关联');
  await seedFunctions.createUserDepartmentRelations(
    prisma,
    departments,
    userData,
    organization.id,
  );

  log('\n🔗 步骤 8: 创建权限关联数据');

  log('  8.1 创建用户权限关联');
  await seedFunctions.createUserPermissionRelations(prisma, userData);

  log('\n📺 步骤 9: 创建渠道数据');
  const channelData = await seedFunctions.createChannels(prisma);

  log('\n📚 步骤 10: 创建项目数据');
  const projectData = await seedFunctions.createProjects(prisma);

  log('\n📖 步骤 11: 创建课程数据');
  const curriculumData = await seedFunctions.createCurriculums(prisma, {
    projects: projectData.projects,
  });

  log('\n📦 步骤 12: 创建产品数据');
  const productData = await seedFunctions.createProducts(prisma);

  log('\n🛒 步骤 13: 创建订单数据');
  const orders = await seedFunctions.createOrders(prisma);

  log('\n💰 步骤 14: 创建退款数据');
  const refunds = await seedFunctions.createRefunds(prisma);

  log('\n🎯 步骤 15: 创建会议数据');

  log('  15.1 创建平台用户');
  const platformUsers = await seedFunctions.createPlatformUsers(prisma);

  log('  15.2 创建会议记录');
  const meetings = await seedFunctions.createMeetings(prisma);

  log('  15.3 创建会议录音');
  const { meetingRecording } = await seedFunctions.createMeetingRecording(
    prisma,
    meetings,
    platformUsers,
  );

  log('  15.4 创建会议总结');
  const teamSummary = await seedFunctions.createMeetingSummary(
    prisma,
    meetings,
    platformUsers,
  );

  const meetingCount = Object.keys(meetings).length;
  const platformUserCount = Object.keys(platformUsers).length;
  const recordingCount = meetingRecording ? 1 : 0;
  const summaryCount = teamSummary ? 1 : 0;

  log('\n✅ 数据库种子数据初始化完成！');
  log('\n📊 统计信息:');
  log(`🏢 组织: ${organization.name} `);
  log(`🏬 部门: ${Object.keys(departments).length} 个`);
  log(`🔑 权限: ${permissions.length} 个`);
  log(`👤 角色: ${roles.length} 个`);
  log(`👥 用户: ${userData.length + 3} 个`);
  log(`📺 渠道: ${channelData.channels.length} 个`);
  log(`📚 项目: ${projectData.projects.length} 个`);
  log(`📖 课程: ${curriculumData.curriculums.length} 个`);
  log(`📦 产品: ${productData.length} 个`);
  log(`🛒 订单: ${orders.length} 个`);
  log(`💰 退款: ${refunds.length} 个`);
  log(`👥 平台用户: ${platformUserCount} 个`);
  log(`🎯 会议: ${meetingCount} 个`);
  log(`📁 会议录音: ${recordingCount} 个`);
  log(`📝 会议总结: ${summaryCount} 个`);
}
