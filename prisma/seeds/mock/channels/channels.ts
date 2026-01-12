/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 00:35:04
 * @FilePath: /nove_api/prisma/seeds/mock/channels.ts
 * @Description: 渠道模块，包含渠道的创建和分配
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { CHANNEL_CONFIGS } from './config';
import type { CreatedChannels } from './type';

export async function createChannels(
  prisma: PrismaClient,
): Promise<CreatedChannels> {
  console.log('📺 开始创建渠道数据...');

  try {
    const channels = await Promise.all(
      CHANNEL_CONFIGS.map(async (config) => {
        const channel = await prisma.channel.upsert({
          where: { code: config.code },
          update: {
            name: config.name,
            description: config.description,
          },
          create: config,
        });

        console.log(`✅ 创建/更新渠道: ${channel.name}`);
        return channel;
      }),
    );

    console.log(`📊 渠道数据创建完成，共 ${channels.length} 个渠道`);
    return { channels };
  } catch (error) {
    console.error('❌ 创建渠道数据失败:', error);
    throw error;
  }
}
