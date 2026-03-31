/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:42:05
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:33:20
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/meetings/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export type MeetingConfig = Omit<
  Prisma.MeetingCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'metadata'
>;
