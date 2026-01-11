import { PrismaClient, PeriodType, GenerationMethod } from '@prisma/client';

/**
 * 创建 ParticipantSummary 测试数据
 * 要求：periodType 必须是 SINGLE，userName 必须有值
 */
export async function createParticipantSummaries(
    prisma: PrismaClient,
    meetingId?: string,
) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const participantSummaries = [
        {
            periodType: PeriodType.SINGLE,
            userName: '张伟',
            partSummary:
                '在本次会议中，张伟主要负责项目进度汇报，详细介绍了当前开发阶段的完成情况，并提出了下一阶段的工作计划。',
            keywords: ['项目进度', '开发计划', '技术方案'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.92,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '李娜',
            partSummary:
                '李娜在会议中分享了用户体验设计的最新成果，展示了新版界面原型，并收集了团队成员的反馈意见。',
            keywords: ['用户体验', '界面设计', '原型展示'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.88,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '王强',
            partSummary:
                '王强重点讨论了系统架构优化方案，提出了微服务拆分的建议，并分析了性能瓶颈的解决思路。',
            keywords: ['系统架构', '微服务', '性能优化'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.95,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '刘芳',
            partSummary:
                '刘芳汇报了测试工作的进展，指出了当前发现的主要问题，并提出了测试覆盖率提升的具体措施。',
            keywords: ['测试进展', '问题跟踪', '质量保证'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.90,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '陈明',
            partSummary:
                '陈明分享了数据库优化的经验，讨论了索引设计和查询性能改进方案，为团队提供了技术指导。',
            keywords: ['数据库优化', '索引设计', '查询性能'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.93,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '赵敏',
            partSummary:
                '赵敏介绍了前端技术栈的升级计划，讨论了 React 18 的新特性应用，并分享了组件库的重构思路。',
            keywords: ['前端技术', 'React升级', '组件库'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.87,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '孙杰',
            partSummary:
                '孙杰汇报了 DevOps 流程的改进情况，介绍了 CI/CD 管道的优化成果，并演示了自动化部署的新功能。',
            keywords: ['DevOps', 'CI/CD', '自动化部署'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.91,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '周婷',
            partSummary:
                '周婷讨论了产品需求的优先级排序，分析了用户反馈数据，并提出了下一版本的功能规划建议。',
            keywords: ['需求管理', '用户反馈', '产品规划'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.89,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '吴涛',
            partSummary:
                '吴涛分享了安全审计的结果，指出了潜在的安全风险点，并提出了加固措施和安全最佳实践建议。',
            keywords: ['安全审计', '风险评估', '安全加固'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.94,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
        {
            periodType: PeriodType.SINGLE,
            userName: '郑丽',
            partSummary:
                '郑丽介绍了文档体系的建设进展，展示了新的技术文档平台，并讨论了知识管理的改进方案。',
            keywords: ['文档建设', '知识管理', '技术文档'],
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.86,
            version: 1,
            isLatest: true,
            startAt: twoHoursAgo,
            endAt: oneHourAgo,
            meetingId,
        },
    ];

    const created: any[] = [];
    for (const data of participantSummaries) {
        const summary = await prisma.participantSummary.create({
            data,
        });
        created.push(summary);
    }

    console.log(`✅ 创建了 ${created.length} 条 ParticipantSummary 测试记录`);
    return created;
}
