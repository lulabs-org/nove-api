/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:24:32
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 02:24:34
 * @FilePath: /nove_api/prisma/seeds/mock/channels/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export const CHANNEL_CONFIGS = [
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
] as const satisfies readonly Prisma.ChannelCreateInput[];
