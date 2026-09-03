import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';

@Injectable()
export class ProfitSharingRecordService {
  private readonly logger = new Logger(ProfitSharingRecordService.name);

  constructor(
    private readonly recordRepository: ProfitSharingRecordRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取流水分页列表
   */
  async getRecords(args: { where?: Prisma.ProfitShareRecordWhereInput, skip?: number, take?: number } = {}) {
    const [records, total] = await Promise.all([
      this.recordRepository.findRecordsWithDetails(args),
      this.recordRepository.countRecords(args.where),
    ]);

    const memberIds = Array.from(new Set(records.map((r) => r.memberId).filter(Boolean)));
    const users = memberIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: memberIds } },
          include: {
            profile: true,
            orgMembers: {
              include: {
                memberRoles: {
                  include: { role: true },
                },
              },
            },
          },
        })
      : [];

    const userMap = new Map<string, { name: string; role?: string }>();
    for (const u of users) {
      const name = u.profile?.displayName || u.profile?.fullName || u.username || u.id;
      const roles = u.orgMembers.flatMap((m) => m.memberRoles.map((mr) => mr.role.name));
      const role = roles.length > 0 ? roles[0] : undefined;
      userMap.set(u.id, { name, role });
    }

    const data = records.map((r) => {
      const userInfo = userMap.get(r.memberId);
      return {
        ...r,
        memberName: userInfo?.name || r.memberId,
        memberRole: userInfo?.role,
      };
    });

    return { data, total };
  }

  /**
   * 获取实时看板统计数据
   */
  async getDashboardStats(month?: string) {
    try {
      const prisma = this.prisma;

      // 确定时间范围
      let dateFilter: { gte: Date; lte: Date } | undefined;
      let monthLabel = '全部历史';

      if (month && month !== 'ALL') {
        const parts = month.split('-');
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
            const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
            const end = new Date(y, m, 0, 23, 59, 59, 999);
            dateFilter = { gte: start, lte: end };
            monthLabel = `${y}-${String(m).padStart(2, '0')}`;
          }
        }
      } else if (!month) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateFilter = { gte: start, lte: end };
        monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }

      // 1. 对应月份/累计处理订单数 (有分润记录的关联订单)
      const orderWhere: Prisma.OrderWhereInput = {
        profitShareRecords: { some: {} },
      };
      if (dateFilter) {
        orderWhere.financialClosedAt = dateFilter;
      }
      const totalOrders = await prisma.order.count({ where: orderWhere });

      // 流水关联过滤
      const recordWhere: Prisma.ProfitShareRecordWhereInput = {};
      if (dateFilter) {
        recordWhere.OR = [
          { order: { financialClosedAt: dateFilter } },
          { order: { financialClosedAt: null }, createdAt: dateFilter },
          ...(month && month !== 'ALL' ? [{ periodMonth: month }] : []),
          { orderId: null, createdAt: dateFilter },
        ];
      }

      // 2. 状态金额统计
      const statusStats = await prisma.profitShareRecord.groupBy({
        by: ['status'],
        _sum: { profitAmount: true },
        where: recordWhere,
      });

      let totalSettled = 0;
      let totalPending = 0;
      let totalClawback = 0;

      for (const stat of statusStats) {
        const amount = (stat._sum.profitAmount || 0) / 100; // 转换成分为元
        if (stat.status === 'SETTLED') totalSettled += amount;
        if (stat.status === 'PENDING') totalPending += amount;
        if (stat.status === 'CLAWBACK') totalClawback += amount;
      }

      // 3. 各模块金额占比
      const moduleWhere: Prisma.ProfitShareRecordWhereInput = {
        ...recordWhere,
        status: { in: ['SETTLED', 'PENDING'] },
      };

      const moduleGroups = await prisma.profitShareRecord.groupBy({
        by: ['moduleId'],
        _sum: { profitAmount: true },
        where: moduleWhere,
      });

      // 获取模块详情 (假设总模块数不多)
      const moduleStats: Array<{
        name: string;
        amount: number;
        percent?: number;
      }> = [];
      let totalModuleAmount = 0;
      for (const mg of moduleGroups) {
        const amount = (mg._sum.profitAmount || 0) / 100;
        totalModuleAmount += amount;

        // 可以直接取缓存或关联，这里简单取库
        const mod = await prisma.profitShareModule.findUnique({
          where: { id: mg.moduleId },
          select: { name: true },
        });
        if (mod) {
          moduleStats.push({ name: mod.name, amount });
        }
      }

      // 计算百分比
      moduleStats.forEach((m) => {
        m.percent =
          totalModuleAmount > 0
            ? Math.round((m.amount / totalModuleAmount) * 100)
            : 0;
      });
      moduleStats.sort((a, b) => b.amount - a.amount);

      // 4. 成员收益排行榜 (Top 5)
      const memberGroups = await prisma.profitShareRecord.groupBy({
        by: ['memberId'],
        _sum: { profitAmount: true },
        where: moduleWhere,
        orderBy: { _sum: { profitAmount: 'desc' } },
        take: 5,
      });

      const memberRankings: Array<{
        name: string;
        role: string;
        amount: number;
      }> = [];
      for (const mg of memberGroups) {
        const amount = (mg._sum.profitAmount || 0) / 100;
        // Fetch user detail with profile and roles
        const user = await prisma.user.findUnique({
          where: { id: mg.memberId },
          include: {
            profile: true,
            orgMembers: {
              include: {
                memberRoles: {
                  include: { role: true },
                },
              },
            },
          },
        });
        const name =
          user?.profile?.displayName ||
          user?.profile?.fullName ||
          user?.username ||
          mg.memberId;
        const roles = user?.orgMembers.flatMap((m) =>
          m.memberRoles.map((mr) => mr.role.name),
        );
        const role = roles && roles.length > 0 ? roles.join(' / ') : '平台成员';

        memberRankings.push({
          name,
          role,
          amount,
        });
      }

      return {
        month: monthLabel,
        totalOrders,
        totalSettled,
        totalPending,
        totalClawback,
        moduleStats,
        memberRankings,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to get dashboard stats: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Failed to get dashboard stats: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * 手动结算单条分润记录
   */
  async settleRecord(id: string) {
    const record = await this.prisma.profitShareRecord.findUnique({ where: { id } });
    if (!record) {
      throw new Error('分润记录不存在');
    }
    if (record.status !== 'PENDING') {
      throw new Error('只有待结算的记录可以手动结算');
    }
    return this.prisma.profitShareRecord.update({
      where: { id },
      data: { status: 'SETTLED' },
    });
  }

  /**
   * 撤销结算（将已结算的记录恢复为待结算）
   */
  async undoSettleRecord(id: string) {
    const record = await this.prisma.profitShareRecord.findUnique({ where: { id } });
    if (!record) {
      throw new Error('分润记录不存在');
    }
    if (record.status !== 'SETTLED') {
      throw new Error('只有已结算的记录可以撤销结算');
    }
    return this.prisma.profitShareRecord.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  /**
   * 手动取消单条分润记录
   */
  async cancelRecord(id: string) {
    const record = await this.prisma.profitShareRecord.findUnique({ where: { id } });
    if (!record) {
      throw new Error('分润记录不存在');
    }
    if (record.status !== 'PENDING') {
      throw new Error('只有待结算的记录可以手动取消');
    }
    return this.prisma.profitShareRecord.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * 恢复被取消的分润记录（撤销取消）
   */
  async restoreRecord(id: string) {
    const record = await this.prisma.profitShareRecord.findUnique({ where: { id } });
    if (!record) {
      throw new Error('分润记录不存在');
    }
    if (record.status !== 'CANCELLED') {
      throw new Error('只有已取消的记录可以恢复');
    }
    return this.prisma.profitShareRecord.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  /**
   * 删除单条分润记录
   */
  async deleteRecord(id: string) {
    const record = await this.prisma.profitShareRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('分润记录不存在');
    }
    return this.prisma.profitShareRecord.delete({ where: { id } });
  }

  /**
   * 批量删除分润记录
   */
  async batchDeleteRecords(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
    }
    const res = await this.prisma.profitShareRecord.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, count: res.count };
  }
}
