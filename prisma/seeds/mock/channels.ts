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

import { PrismaClient, Channel } from '@prisma/client';

export interface CreatedChannels {
  channels: Channel[];
}

const CHANNEL_CONFIGS = [
  {
    name: '官方网站',
    code: 'OFFICIAL_WEBSITE',
    description: '官方网站直接购买渠道',
  },
  {
    name: '抖音小店',
    code: 'DOUYIN_SHOP',
    description: '抖音平台销售渠道',
  },
  {
    name: '微信小程序',
    code: 'WECHAT_MINIPROGRAM',
    description: '微信小程序销售渠道',
  },
  {
    name: '淘宝店铺',
    code: 'TAOBAO_SHOP',
    description: '淘宝平台销售渠道',
  },
  {
    name: '线下推广',
    code: 'OFFLINE_PROMOTION',
    description: '线下活动推广渠道',
  },
  {
    name: '合作伙伴',
    code: 'PARTNER',
    description: '合作伙伴推荐渠道',
  },
] as const;

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
