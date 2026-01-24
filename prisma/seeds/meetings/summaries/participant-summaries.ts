/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-24
 * @Description: 创建参与者会议总结种子数据
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, PeriodType, GenerationMethod, Prisma } from '@prisma/client';

export async function createParticipantSummaries(
    prisma: PrismaClient,
    meetings: {
        meetings: Array<{
            meeting: Prisma.MeetingGetPayload<Record<string, never>>;
        }>;
    },
): Promise<Prisma.ParticipantSummaryGetPayload<Record<string, never>>[]> {
    console.log('📝 开始创建参与者会议总结数据...');

    const participantNames = [
        '张三', '李四', '王五', '赵六', '钱七',
        '孙八', '周九', '吴十', '郑十一', '陈十二'
    ];

    const summaryTemplates = [
        '积极参与讨论，提出了多个建设性意见，对项目推进起到了关键作用。在技术方案选型上展现了专业能力。',
        '全程认真听讲，做了详细笔记，对会议内容理解透彻。提出的问题很有针对性，帮助团队发现了潜在风险。',
        '分享了丰富的实践经验，为团队提供了宝贵的参考。在讨论环节表现活跃，推动了多个议题的深入探讨。',
        '作为项目负责人，清晰地阐述了项目进展和遇到的挑战。协调能力强，有效促进了团队协作。',
        '技术功底扎实，对复杂问题的分析很到位。提供的解决方案切实可行，得到了团队的一致认可。',
        '善于倾听他人意见，能够快速理解并整合不同观点。在会议总结环节表现出色，梳理清晰。',
        '对业务需求理解深刻，能够从用户角度提出有价值的建议。在产品设计讨论中贡献突出。',
        '沟通能力强，能够清晰表达自己的想法。在团队协作中起到了良好的桥梁作用。',
        '关注细节，指出了多处容易被忽略的问题。严谨的工作态度值得团队学习。',
        '创新思维活跃，提出了几个很有创意的想法。为项目带来了新的思路和可能性。'
    ];

    const keywordsList = [
        ['技术方案', '项目推进', '建设性意见'],
        ['详细笔记', '风险识别', '问题分析'],
        ['实践经验', '团队协作', '深入讨论'],
        ['项目管理', '进度跟踪', '协调沟通'],
        ['技术分析', '解决方案', '团队认可'],
        ['倾听理解', '观点整合', '会议总结'],
        ['业务需求', '用户视角', '产品设计'],
        ['沟通表达', '团队协作', '桥梁作用'],
        ['关注细节', '问题发现', '严谨态度'],
        ['创新思维', '创意想法', '新思路']
    ];

    try {
        const participantSummaries = await Promise.all(
            participantNames.map(async (name, index) => {
                // 使用第一个会议作为关联
                const meeting = meetings.meetings[0].meeting;

                return await prisma.participantSummary.create({
                    data: {
                        periodType: PeriodType.SINGLE,
                        meetingId: meeting.id,
                        userName: name,
                        partSummary: summaryTemplates[index],
                        keywords: keywordsList[index],
                        generatedBy: GenerationMethod.AI,
                        aiModel: 'gpt-4',
                        confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95之间的随机值
                        version: 1,
                        isLatest: true,
                    },
                });
            }),
        );

        console.log(`✅ 参与者会议总结创建完成，共 ${participantSummaries.length} 条记录`);
        return participantSummaries;
    } catch (error) {
        console.error('❌ 创建参与者会议总结失败:', error);
        throw error;
    }
}
