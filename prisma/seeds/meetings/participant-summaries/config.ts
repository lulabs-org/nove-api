/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-24
 * @Description: 参与者会议总结配置
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import type { ParticipantSummaryConfig } from './type';

export const PARTICIPANT_SUMMARY_CONFIGS: readonly ParticipantSummaryConfig[] =
  [
    {
      userName: '张三',
      partSummary:
        '积极参与讨论，提出了多个建设性意见，对项目推进起到了关键作用。在技术方案选型上展现了专业能力。',
      keywords: ['技术方案', '项目推进', '建设性意见'],
    },
    {
      userName: '李四',
      partSummary:
        '全程认真听讲，做了详细笔记，对会议内容理解透彻。提出的问题很有针对性，帮助团队发现了潜在风险。',
      keywords: ['详细笔记', '风险识别', '问题分析'],
    },
    {
      userName: '王五',
      partSummary:
        '分享了丰富的实践经验，为团队提供了宝贵的参考。在讨论环节表现活跃，推动了多个议题的深入探讨。',
      keywords: ['实践经验', '团队协作', '深入讨论'],
    },
    {
      userName: '赵六',
      partSummary:
        '作为项目负责人，清晰地阐述了项目进展和遇到的挑战。协调能力强，有效促进了团队协作。',
      keywords: ['项目管理', '进度跟踪', '协调沟通'],
    },
    {
      userName: '钱七',
      partSummary:
        '技术功底扎实，对复杂问题的分析很到位。提供的解决方案切实可行，得到了团队的一致认可。',
      keywords: ['技术分析', '解决方案', '团队认可'],
    },
    {
      userName: '孙八',
      partSummary:
        '善于倾听他人意见，能够快速理解并整合不同观点。在会议总结环节表现出色，梳理清晰。',
      keywords: ['倾听理解', '观点整合', '会议总结'],
    },
    {
      userName: '周九',
      partSummary:
        '对业务需求理解深刻，能够从用户角度提出有价值的建议。在产品设计讨论中贡献突出。',
      keywords: ['业务需求', '用户视角', '产品设计'],
    },
    {
      userName: '吴十',
      partSummary:
        '沟通能力强，能够清晰表达自己的想法。在团队协作中起到了良好的桥梁作用。',
      keywords: ['沟通表达', '团队协作', '桥梁作用'],
    },
    {
      userName: '郑十一',
      partSummary:
        '关注细节，指出了多处容易被忽略的问题。严谨的工作态度值得团队学习。',
      keywords: ['关注细节', '问题发现', '严谨态度'],
    },
    {
      userName: '陈十二',
      partSummary:
        '创新思维活跃，提出了几个很有创意的想法。为项目带来了新的思路和可能性。',
      keywords: ['创新思维', '创意想法', '新思路'],
    },
  ] as const;
