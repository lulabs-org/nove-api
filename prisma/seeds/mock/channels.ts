/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-16 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-16 10:00:00
 * @FilePath: /lulab_backend/prisma/seeds/channels.ts
 * @Description: 渠道数据种子模块 - 优化版本
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { PrismaClient, Channel } from '@prisma/client';

// ==================== 类型定义 ====================

/**
 * 创建渠道后返回的数据
 */
export interface CreatedChannels {
  channels: Channel[];
}

/**
 * 渠道配置数据类型
 */
interface ChannelConfig {
  name: string;
  code: string;
  description?: string;
}

// ==================== 渠道配置数据 ====================

/**
 * 渠道配置数据
 */
const CHANNEL_CONFIGS: ChannelConfig[] = [
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
];

// ==================== 主函数 ====================

/**
 * 创建渠道数据
 *
 * @param prisma - Prisma 客户端实例
 * @returns 创建的渠道数据
 */
export async function createChannels(
  prisma: PrismaClient,
): Promise<CreatedChannels> {
  console.log('📺 开始创建渠道数据...');

  try {
    // 并行创建所有渠道
    const channelPromises = CHANNEL_CONFIGS.map(async (config) => {
      // 先查找是否存在（使用 findFirst 因为 code 不是主键）
      const existing = await prisma.channel.findFirst({
        where: { code: config.code },
      });

      let channel: Channel;
      if (existing) {
        // 如果存在，使用 id 进行更新
        channel = await prisma.channel.update({
          where: { id: existing.id },
          data: {
            name: config.name,
            description: config.description,
          },
        });
      } else {
        // 如果不存在，创建新记录
        channel = await prisma.channel.create({
          data: config,
        });
      }

      console.log(`✅ 创建/更新渠道: ${channel.name}`);
      return channel;
    });

    const channels = await Promise.all(channelPromises);

    console.log(`📊 渠道数据创建完成，共 ${channels.length} 个渠道`);
    return { channels };
  } catch (error) {
    console.error('❌ 创建渠道数据失败:', error);
    throw error;
  }
}
