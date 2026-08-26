/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-24
 * @Description: 参与者会议总结类型定义
 * @FilePath: /nove_api/prisma/seeds/mock/minutes/speaker-summaries/type.ts
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export type SpeakerSummaryConfig = {
  userName: string;
  partSummary: string;
  keywords: string[];
};

export type SpeakerSummary = Prisma.SpeakerSummaryGetPayload<
  Record<string, never>
>;
