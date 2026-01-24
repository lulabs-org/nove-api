/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-24
 * @Description: 参与者会议总结类型定义
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export type ParticipantSummaryConfig = {
  userName: string;
  partSummary: string;
  keywords: string[];
};

export type ParticipantSummary = Prisma.ParticipantSummaryGetPayload<
  Record<string, never>
>;
