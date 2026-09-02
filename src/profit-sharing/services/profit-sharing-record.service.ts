import { Injectable, Logger } from '@nestjs/common';
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
    const [data, total] = await Promise.all([
      this.recordRepository.findRecordsWithDetails(args),
      this.recordRepository.countRecords(args.where),
    ]);
    return { data, total };
  }

  /**
   * 获取实时看板统计数据
   */
  async getDashboardStats() {
    try {
      const prisma = this.prisma;

      // 1. 本月累计处理订单数 (有分润记录的关联订单)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const totalOrders = await prisma.order.count({
        where: {
          financialClosedAt: { gte: startOfMonth },
          profitShareRecords: { some: {} },
        },
      });

      // 2. 状态金额统计
      const statusStats = await prisma.profitShareRecord.groupBy({
        by: ['status'],
        _sum: { profitAmount: true },
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
      const moduleGroups = await prisma.profitShareRecord.groupBy({
        by: ['moduleId'],
        _sum: { profitAmount: true },
        where: { status: { in: ['SETTLED', 'PENDING'] } },
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
        where: { status: { in: ['SETTLED', 'PENDING'] } },
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
        // Fetch user detail
        const user = await prisma.user.findUnique({
          where: { id: mg.memberId },
          select: { username: true },
        });
        // Fetch role context if possible, or just default to something generic for now
        memberRankings.push({
          name: user?.username || mg.memberId,
          role: '平台成员', // 这里如果要取准确的 roleName，需要更复杂的连表或查 userRoles，简化处理
          amount,
        });
      }

      return {
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
}
