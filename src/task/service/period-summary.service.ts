import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenaiService } from '../../integrations/openai/openai.service';

export class PeriodSummary {
  // 让构造器导入prisma和openaiService
  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenaiService,
  ) {}

  /**
   * 获取所有符合条件的 participantSummary 记录，并按 userId 分组
   * @returns 分组数组，每个元素包含 userId 和对应 platformUserIds
   */
  async getGroupedPlatformUsers(): Promise<
    { userId: string | null; platformUserIds: string[] }[]
  > {
    // 查所有participantSummary的记录，但只拿平台用户的 id 和 userId
    const summaries =
      (await this.prisma.participantSummary.findMany({
        where: {
          platformUserId: { not: null }, // 平台用户不为空
          periodType: 'SINGLE', // 仅单次会议
        },
        select: {
          platformUser: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      })) ?? []; // 如果返回 null/undefined，默认是空数组

    // 如果没有值，直接返回
    if (summaries.length === 0) {
      return []; // 只返回数组
    }

    // 去重
    const seen = new Set<string>();
    // filter 会一条条遍历 summaries，如果 id 重复就不放入 uniqueSummaries，第一次出现的保留。
    const uniqueSummaries = summaries.filter((item) => {
      const id = item.platformUser?.id;
      if (!id) return false; // 如果 platformUser 或 id 为 null，直接过滤掉
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // console.log(uniqueSummaries);

    // 按 userId 分组，把相同 userId 的 platformUser.id 收集到同一组，userId 为 null 也单独分组
    const groupedMap = new Map<
      string | null,
      { userId: string | null; platformUserIds: string[] }
    >();

    for (const item of uniqueSummaries) {
      const userId = item.platformUser?.userId ?? null; // 取 userId，null 也作为 key
      // mapKey 为 userId 或 platformUserId，用于分组
      const mapKey =
        userId === null
          ? `__null__:${item.platformUser!.id}` // 每个 null 都不同
          : userId;

      if (!groupedMap.has(mapKey)) {
        // 如果 groupedMap 没有这个 mapKey 的分组，就初始化一个新的组
        groupedMap.set(mapKey, { userId, platformUserIds: [] }); // 初始化分组(第一个 userId 是检索用的key)
      }
      // 如果有这个 mapKey 的分组，就添加这条 platformUser.id
      groupedMap.get(mapKey)!.platformUserIds.push(item.platformUser!.id); // 添加 platformUser.id
    }

    // 转成数组方便使用 (Map 是数据结构，不方便直接当作普通数组使用)
    return Array.from(groupedMap.values());
  }

  /**
   * 获取某组 platformUserIds 对应的 participantSummary 记录
   * @param platformUserIds 平台用户 ID 数组
   * @returns 每条记录包含 id、partSummary、partName、startAt、endAt、username
   */
  async getSummariesByPlatformUserIds(platformUserIds: string[]): Promise<
    {
      id: string;
      partSummary: string;
      partName: string;
      startAt: Date;
      endAt: Date;
      username: string;
    }[]
  > {
    // 查找当前分组下所有 platformUserId 对应的 participantSummary
    const summaries = await this.prisma.participantSummary.findMany({
      where: {
        platformUserId: { in: platformUserIds }, // 当前分组的所有 platformUserId
        periodType: 'SINGLE', // 仅单次会议
      },
      select: {
        id: true, // 会议总结ID，用于创建 SummaryRelation
        partSummary: true, // 会议总结
        partName: true, // 参会人信息
        startAt: true, // 开始时间(总结的时间区间)
        endAt: true, // 结束时间(总结的时间区间)
        platformUser: {
          select: {
            user: {
              select: {
                username: true, // 通过平台用户检索到真实user的用户名
              },
            },
          },
        },
      },
    });

    // 扁平化 username
    return summaries.map((s) => ({
      id: s.id,
      partSummary: s.partSummary,
      partName: s.partName,
      startAt: s.startAt,
      endAt: s.endAt,
      username: s.platformUser?.user?.username ?? '未知用户', // 处理 null
    }));
  }

  /**
   * 调用 OpenAI 生成每日会议总结
   * @param realName 用户真实姓名或昵称
   * @param summaries 当前用户当天的所有会议记录
   * @param prompt 系统提示词，可自定义
   * @returns AI 生成的总结文本
   */
  async generateSummary(
    realName: string,
    summaries: {
      id: string;
      partSummary: string;
      partName: string;
      startAt: Date;
      endAt: Date;
      username: string;
    }[],
    prompt: string,
  ): Promise<string> {
    const question = JSON.stringify(summaries);

    const systemPrompt = `
      ${prompt}
      你是人工智能助手，需要总结用户 ${realName} 当天的会议记录。
      字段说明：
      - partName: 参会人在当堂会议的昵称
      - partSummary: 参会人当堂会议的总结
      - startAt: 会议总结的开始区间
      - endAt: 会议总结的结束区间
      - username: 用户的真实姓名

      切记以上只是字段解释，不是输出内容。
      你只需要根据用户输入，总结用户在会议中的活动，不需要特别格式。
      `.trim();

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    return this.openaiService.createChatCompletion(messages);
  }

  /**
   * 保存 AI 总结到 participantSummary，并创建 summaryRelation 关联
   * @param params 传入 realName、reply、userId、platformUserIds、summaries
   * @returns 保存结果对象，包含成功状态、parentSummary ID 和提示信息
   */
  async saveSummaryWithRelations(params: {
    realName: string;
    reply: string;
    userId: string | null;
    platformUserIds: string[];
    summaries: { id: string }[];
  }) {
    const { realName, reply, userId, platformUserIds, summaries } = params;

    const now = new Date();
    // 当天凌晨0点
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    // 当天23:59:59
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    // 保存ai总结内容至ParticipantSummary
    const parentSummary = await this.prisma.participantSummary.create({
      data: {
        periodType: 'DAILY',
        startAt: startOfDay,
        endAt: endOfDay,
        partName: realName,
        partSummary: reply,

        // 关键逻辑：有 userId 就只存 userId，没有才存 platformUserId
        ...(userId ? { userId } : { platformUserId: platformUserIds[0] }),
      },
    });

    // 遍历 summaries，把每条记录的 id 作为 childSummaryId 创建 SummaryRelation
    for (const childSummary of summaries) {
      await this.prisma.summaryRelation.create({
        data: {
          parentSummaryId: parentSummary.id, // parentSummary 已经定义
          childSummaryId: childSummary.id,
          parentPeriodType: 'DAILY',
        },
      });
    }

    return {
      ok: true,
      id: parentSummary.id,
      message: `ParticipantSummary for ${realName} saved successfully`,
    };
  }

  /**
   * 处理单个用户的每日会议总结流程
   * - 获取该用户的会议记录
   * - 判断 realName（userId / platformUser）
   * - 调用 AI 生成总结
   * - 保存总结并创建关联
   * - 打印日志
   * @param group 单个用户分组信息，包含 userId 和 platformUserIds
   */
  async processOneUserDailySummary(group: {
    userId: string | null;
    platformUserIds: string[];
  }) {
    const { userId, platformUserIds } = group;

    // 查找当前分组下所有 platformUserId 对应的 participantSummary
    const summaries = await this.getSummariesByPlatformUserIds(platformUserIds);

    let realName: string;

    if (userId === null) {
      // userId 为 null：realName = partName
      realName = summaries[0]?.partName ?? '未知用户';
    } else {
      // userId 不为 null：realName = username
      realName = summaries[0]?.username ?? '未知用户';
    }

    console.log(
      `\x1b[96mUser获取到用户(${userId})的参会议记录:\x1b[0m\n` +
        JSON.stringify(summaries, null, 2),
    );

    // 总结会议记录
    const reply = await this.generateSummary(
      realName,
      summaries,
      '', // 或者你之后自定义 prompt
    );
    console.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);

    console.log(
      `\x1b[92m当前用户(${userId})的会议记录已完成:\x1b[0m\n` +
        JSON.stringify(summaries, null, 2),
    );

    // 保存总结内容和关系至ParticipantSummary
    const saveResult = await this.saveSummaryWithRelations({
      realName,
      reply,
      userId,
      platformUserIds,
      summaries,
    });
    console.log(saveResult);
  }

  /**
   * 处理每日会议总结任务（批量处理所有用户）
   * - 调用 getGroupedPlatformUsers 获取所有分组
   * - 遍历每个分组，调用 processOneUserDailySummary 处理
   * - 每处理完一个用户，等待 5 秒以防压力过大
   * @param job BullMQ Job 对象（可用于任务追踪）
   * @returns 处理完成状态及时间戳
   */
  async processDailySummary(job: Job): Promise<{ ok: boolean; at: string }> {
    console.log(
      '开始执行任务: personalDailyMeetingSummary',
      new Date().toISOString(),
    );

    // 调用 getGroupedPlatformUsers 方法获取分组结果
    const data = await this.getGroupedPlatformUsers();

    // 如果没有值，直接返回
    if (data.length === 0) {
      console.log('没有找到符合条件的记录, participantSummary的新增记录为空');
      return { ok: true, at: new Date().toISOString() }; // 或者 return null / throw Error，根据你的需求
    }

    // 打印分组结果
    console.log(
      '在participantSummary表检索到以下用户:\n' + JSON.stringify(data, null, 2),
    ); // 第二个参数 null 表示不格式化，第三个参数 2 表示缩进 2 个空格

    console.log('开始依次总结每个用户的会议记录');

    // 遍历每个分组，处理一个用户的会议记录
    for (const group of data) {
      await this.processOneUserDailySummary(group);

      // 等待 5 秒
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { ok: true, at: new Date().toISOString() };
  }

  // 未来可以添加其他方法
  // async processWeeklySummary(job: Job) { ... }
  // async processMonthlySummary(job: Job) { ... }
}
