/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:36:20
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:38:22
 * @FilePath: /nove_api/prisma/seeds/mock/minutes/minute-summaries/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ProcessingStatus, GenerationMethod } from '@prisma/client';
import type { MinuteSummaryConfig } from './type';

export const MINUTE_SUMMARY_CONFIGS: {
  teamSummary: MinuteSummaryConfig;
} = {
  teamSummary: {
    content: '本次会议主要讨论了各项目的进展情况...',
    generatedBy: GenerationMethod.AI,
    aiModel: 'gpt-4',
    keyPoints: [
      '项目A进度正常，预计下周完成',
      '项目B遇到技术难点，需要额外支持',
      '团队需要加强代码审查流程',
    ],
    actionItems: [
      { assignee: '张三', task: '跟进项目A的测试进度', deadline: '2024-12-22' },
      {
        assignee: '李四',
        task: '协调资源解决项目B的技术问题',
        deadline: '2024-12-20',
      },
    ],
    decisions: ['决定采用新的代码审查工具', '调整项目B的开发计划'],
  },
} as const;
