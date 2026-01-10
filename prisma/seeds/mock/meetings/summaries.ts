import {
  PrismaClient,
  ProcessingStatus,
  GenerationMethod,
  Prisma,
} from '@prisma/client';

const MEETING_SUMMARY_CONFIGS = {
  teamSummary: {
    title: '周例会总结 - 2024年12月第3周',
    content: '本次会议主要讨论了各项目的进展情况...',
    generatedBy: GenerationMethod.AI,
    aiModel: 'gpt-4',
    confidence: 0.95,
    language: 'zh-CN',
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
    participants: [
      { name: '张三', role: '项目负责人', attendance: '全程参与' },
      { name: '李四', role: '技术负责人', attendance: '全程参与' },
    ],
    status: ProcessingStatus.COMPLETED,
  },
} as const;

export interface CreatedMeetingSummaries {
  teamSummary: Prisma.MeetingSummaryGetPayload<Record<string, never>>;
}

export async function createTeamSummary(
  prisma: PrismaClient,
  meetingId: string,
  creatorPlatformUserId?: string,
) {
  return prisma.meetingSummary.create({
    data: {
      meetingId,
      ...MEETING_SUMMARY_CONFIGS.teamSummary,
      createdId: creatorPlatformUserId,
      processingTime: 30000,
      status: ProcessingStatus.COMPLETED,
    },
  });
}
