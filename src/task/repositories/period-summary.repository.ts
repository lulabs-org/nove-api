/*
 * @Author: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @Date: 2026-01-11 15:11:23
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-01-25 10:21:22
 * @FilePath: \nove-api\src\task\repositories\period-summary.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PeriodSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查所有participantSummary的记录，但只拿平台用户的 id 和 userId
   */
  async findAllMeetingSummaries({
    startOfDay,
    endOfDay,
  }: {
    startOfDay: Date;
    endOfDay: Date;
  }) {
    return (
      (await this.prisma.participantSummary.findMany({
        where: {
          platformUserId: { not: null }, // 平台用户不为空
          periodType: 'SINGLE', // 仅单次会议
          periodStart: { gte: startOfDay }, // 开始时间大于等于当天凌晨
          periodEnd: { lte: endOfDay }, // 结束时间小于等于当天结束
        },
        select: {
          platformUser: {
            select: {
              id: true,
              user: {
                select: { id: true },
              },
            },
          },
        },
      })) ?? [] // 如果返回 null/undefined，默认是空数组
    );
  }

  /**
   * 查找当前分组下所有 platformUserId 对应的 participantSummary
   */
  async findSummaryByPlatformUserIds({
    platformUserIds,
    startOfDay,
    endOfDay,
  }: {
    platformUserIds: string[];
    startOfDay: Date;
    endOfDay: Date;
  }) {
    return await this.prisma.participantSummary.findMany({
      where: {
        platformUserId: { in: platformUserIds }, // 当前分组的所有 platformUserId
        periodType: 'SINGLE', // 仅单次会议
        periodStart: { gte: startOfDay }, // 开始时间大于等于当天凌晨
        periodEnd: { lte: endOfDay }, // 结束时间小于等于当天结束
      },
      select: {
        id: true, // 会议总结ID，用于创建 SummaryRelation
        partSummary: true, // 会议总结
        userName: true, // 参会人信息
        periodStart: true, // 开始时间(总结的时间区间)
        periodEnd: true, // 结束时间(总结的时间区间)
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
  }

  /**
   * 创建周期性总结
   */
  async createPeriodSummary(data: {
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    periodStart: Date;
    periodEnd: Date;
    userName: string;
    partSummary: string;
    userId?: string;
    platformUserId?: string;
  }) {
    return await this.prisma.participantSummary.create({
      data: {
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        userName: data.userName,
        partSummary: data.partSummary,

        // 关键逻辑：有 userId 就只存 userId，没有才存 platformUserId
        ...(data.userId
          ? { userId: data.userId }
          : { platformUserId: data.platformUserId }),
      },
    });
  }

  /**
   * 创建总结关联关系
   */
  async createSummaryRelation(data: {
    parentSummaryId: string;
    childSummaryId: string;
    parentPeriodType: 'SINGLE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    childPeriodType: 'SINGLE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) {
    return this.prisma.summaryRelation.create({
      data,
    });
  }
}
