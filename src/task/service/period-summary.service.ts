import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenaiService } from '../../integrations/openai/openai.service';

export class PeriodSummary {
  // 让构造器导入prisma和openaiService
  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenaiService,
  ) {}

  // 获取所有符合条件 participantSummary 表中的新增记录，按 userId 分组
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
        groupedMap.set(mapKey, { userId, platformUserIds: [] }); // 初始化分组(第一个 userId 是检索用的key)
      }
      groupedMap.get(mapKey)!.platformUserIds.push(item.platformUser!.id); // 添加 platformUser.id
    }

    // 转成数组方便使用 (Map 是数据结构，不方便直接当作普通数组使用)
    return Array.from(groupedMap.values());
  }

  /**
   * 处理每日会议总结任务
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

    for (let i = 0; i < data.length; i++) {
      const group = data[i]; // 当前分组对象 { userId, platformUserIds }
      const { userId, platformUserIds } = group;

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

      let realName: string;

      if (userId === null) {
        // userId 为 null：realName = partName
        realName = summaries[0]?.partName ?? '未知用户';
        // 如果没有User用户，就总结平台用户的会议记录
        console.log(
          `\x1b[96m平台用户(${platformUserIds})的参会议记录:\x1b[0m\n` +
            JSON.stringify(summaries, null, 2),
        );
      } else {
        // userId 不为 null：realName = username
        realName = summaries[0]?.platformUser?.user?.username ?? '未知用户';
        // 如果有User用户，就总结User用户的会议记录
        console.log(
          `\x1b[96mUser用户(${userId})的参会议记录:\x1b[0m\n` +
            JSON.stringify(summaries, null, 2),
        );
      }

      // 开始总结会议记录
      const question = JSON.stringify(summaries); // 用户问题
      const systemPrompt = `
            你是人工智能助手，需要总结用户${realName}当天的会议记录。
            字段说明：
            - partName: 参会人在当堂会议的昵称
            - partSummary: 参会人当堂会议的总结
            - startAt: 会议总结的开始区间(相当于从这个时间开始总结)
            - endAt: 会议总结的结束区间(相当于从这个时间结束总结)
            - platformUser: {"user":{"username":用户的真实姓名}}
            切记这个只是解释用户输入的字段类型,并不是你要输出的内容,
            你只需要根据用户输入的字段,总结用户在会议中的活动,不需要特别的格式。
            `.trim(); // 系统提示词,.trim() 去掉首尾空格

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: question },
      ];
      const reply = await this.openaiService.createChatCompletion(messages);
      console.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);

      if (userId === null) {
        // 如果没有User用户，就总结平台用户的会议记录
        console.log(
          `\x1b[92m当前平台用户(${platformUserIds})的会议记录已总结:\x1b[0m\n` +
            JSON.stringify(summaries, null, 2),
        );
      } else {
        // 如果有User用户，就总结User用户的会议记录
        console.log(
          `\x1b[92m当前User用户(${userId})的会议记录已总结:\x1b[0m\n` +
            JSON.stringify(summaries, null, 2),
        );
      }

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

      // 等待 5 秒
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { ok: true, at: new Date().toISOString() };
  }

  // 未来可以添加其他方法
  // async processWeeklySummary(job: Job) { ... }
  // async processMonthlySummary(job: Job) { ... }
}
