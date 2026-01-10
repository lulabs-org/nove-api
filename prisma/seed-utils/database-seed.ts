/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 00:39:44
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 02:22:20
 * @FilePath: /nove_api/prisma/seed-utils/database-seed.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import type { SeedMode } from './types';
import * as seedFunctions from '../seeds/mock/index';

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
  log('👤 创建真实数据：管理员账户...');

  const { adminUser, adminRole } = await seedFunctions.createAdmin(prisma);

  log('\n✅ 真实数据初始化完成！');
  log('\n📊 统计信息:');
  log(`👤 管理员用户: 1 个 (${adminUser.email})`);
  log(`🎭 管理员角色: 1 个 (${adminRole.code})`);
}

async function seedMockDatabase(prisma: PrismaClient): Promise<void> {
  log('\n🔑 步骤 1: 创建权限和完整角色体系');
  const permissionData = await seedFunctions.createPermissions(prisma);

  log('\n👥 步骤 2: 创建用户并分配角色');
  const userData = await seedFunctions.createUsers(
    prisma,
    permissionData.roles,
  );

  log('\n🏢 步骤 3: 创建组织和部门结构');
  const organization = await seedFunctions.createOrganization(prisma);
  const departments = await seedFunctions.createDepartments(
    prisma,
    organization.id,
  );

  log('\n🔗 步骤 3.1: 创建用户部门关联');
  await seedFunctions.createUserDepartmentRelations(
    prisma,
    departments,
    userData,
  );

  log('\n🔗 步骤 3.2: 创建关联表数据');
  await seedFunctions.createAllRelations(
    prisma,
    organization.id,
    userData,
    permissionData.roles,
  );

  log('\n📺 步骤 4: 创建渠道数据');
  const channelData = await seedFunctions.createChannels(prisma);

  log('\n📚 步骤 5: 创建项目数据');
  const projectData = await seedFunctions.createProjects(prisma);

  log('\n📖 步骤 6: 创建课程数据');
  const curriculumData = await seedFunctions.createCurriculums(prisma, {
    projects: projectData.projects,
  });

  log('\n📦 步骤 7: 创建产品数据');
  const productData = await seedFunctions.createProducts(
    prisma,
    userData.adminUser,
  );

  log('\n🛒 步骤 8: 创建订单数据');
  const orders = await seedFunctions.createOrders(prisma, {
    users: userData,
    products: productData.products,
    channels: channelData.channels,
  });

  log('\n💰 步骤 9: 创建退款数据');
  const refunds = await seedFunctions.createRefunds(prisma, {
    users: userData,
    orders,
  });

  log('\n🎯 步骤 10: 创建会议数据');
  log('  10.1 创建平台用户');
  const platformUsers = await seedFunctions.createPlatformUsers(prisma);

  log('  10.2 创建会议记录');
  const meetings = await seedFunctions.createMeetings(
    prisma,
    platformUsers as unknown as Record<
      string,
      Prisma.PlatformUserGetPayload<Record<string, never>>
    >,
  );

  log('  10.3 创建会议录音');
  const { meetingRecording } = await seedFunctions.createTeamMeetingRecording(
    prisma,
    meetings.teamMeeting.id,
    platformUsers.host1.id,
  );

  log('  10.4 创建会议总结');
  const teamSummary = await seedFunctions.createTeamSummary(
    prisma,
    meetings.teamMeeting.id,
    platformUsers.host1.id,
  );

  log('  10.5 创建会议参与者');
  const participants = await seedFunctions.createMeetingParticipants(
    prisma,
    meetings as unknown as Record<
      string,
      Prisma.MeetingGetPayload<Record<string, never>>
    >,
    platformUsers as unknown as Record<
      string,
      Prisma.PlatformUserGetPayload<Record<string, never>>
    >,
  );

  log('\n✅ 数据库种子数据初始化完成！');
  log('\n📊 统计信息:');
  log(`👥 用户: ${userData.normalUsers.length + 3} 个`);
  log(`🎭 角色: ${Object.keys(permissionData.roles).length} 个`);
  log(`🔑 权限: ${permissionData.permissions.length} 个`);
  log(`🏢 组织: 1 个`);
  log(`🏬 部门: ${Object.keys(departments).length} 个`);
  log(`📺 渠道: ${channelData.channels.length} 个`);
  log(`📚 项目: ${projectData.projects.length} 个`);
  log(`📖 课程: ${curriculumData.curriculums.length} 个`);
  log(`📦 产品: ${productData.products.length} 个`);
  log(`🛒 订单: ${orders.length} 个`);
  log(`💰 退款: ${refunds.length} 个`);

  if (meetings) {
    const meetingCount = Object.keys(meetings).length;
    const platformUserCount = Object.keys(platformUsers).length;
    const recordingCount = meetingRecording ? 1 : 0;
    const summaryCount = teamSummary ? 1 : 0;
    const participantCount =
      participants.teamMeetingParticipants.length +
      participants.clientMeetingParticipants.length +
      participants.trainingMeetingParticipants.length +
      participants.emergencyMeetingParticipants.length;

    log(`🎯 会议: ${meetingCount} 个`);
    log(`👥 平台用户: ${platformUserCount} 个`);
    log(`📁 会议录音: ${recordingCount} 个`);
    log(`📝 会议总结: ${summaryCount} 个`);
    log(`👥 会议参与者: ${participantCount} 个`);
  }
}
