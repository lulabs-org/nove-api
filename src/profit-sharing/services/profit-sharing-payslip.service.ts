import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProfitShareRecordStatus,
  ProfitShareRuleType,
  ProfitShareRuleStatus,
  Prisma,
} from '@prisma/client';
import {
  PayslipItemCategory,
  CreatePayslipAdjustmentDto,
} from '../dto/payslip-adjustment.dto';

export interface PayslipSummaryItem {
  memberId: string;
  memberName: string;
  username?: string;
  memberRole?: string;
  departmentName?: string;
  phone?: string;
  month: string;
  // 5大薪资板块
  baseSalaryAmount: number; // 分 (底薪/课酬)
  commissionAmount: number; // 分 (订单提成)
  bonusAmount: number; // 分 (各类奖金)
  subsidyAmount: number; // 分 (津贴补贴)
  deductionAmount: number; // 分 (各项扣除)
  // 兼顾向后兼容字段
  fixedAmount: number; // 分 = baseSalaryAmount
  clawbackAmount: number; // 分 = deductionAmount
  // 项数统计
  orderCount: number;
  bonusCount: number;
  subsidyCount: number;
  deductionCount: number;
  // 汇总
  totalGrossAmount: number; // 分: baseSalary + commission + bonus + subsidy - deduction
  settledAmount: number; // 分
  pendingAmount: number; // 分
  status: 'SETTLED' | 'PENDING' | 'PARTIALLY_SETTLED';
}

export interface PayslipMonthStats {
  month: string;
  totalGrossAmount: number; // 分
  totalBaseSalaryAmount: number; // 分
  totalCommissionAmount: number; // 分
  totalBonusAmount: number; // 分
  totalSubsidyAmount: number; // 分
  totalDeductionAmount: number; // 分
  totalSettledAmount: number; // 分
  totalPendingAmount: number; // 分
  totalMembers: number;
}

@Injectable()
export class ProfitSharingPayslipService {
  private readonly logger = new Logger(ProfitSharingPayslipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 识别流水记录归属的薪酬板块类别
   */
  classifyRecord(r: {
    ruleSnapshot?: any;
    status: ProfitShareRecordStatus;
    profitAmount: number;
    orderId?: string | null;
    module?: { name: string } | null;
    rule?: { name: string; ruleType?: ProfitShareRuleType } | null;
  }): PayslipItemCategory {
    // 1. 优先读取快照中的显式类别定义
    const snapshotCategory = (r.ruleSnapshot as any)?.category;
    if (snapshotCategory && Object.values(PayslipItemCategory).includes(snapshotCategory)) {
      return snapshotCategory as PayslipItemCategory;
    }

    const profitAmount = r.profitAmount ?? 0;
    const moduleName = (r.module?.name || '').toLowerCase();
    const ruleName = (r.rule?.name || '').toLowerCase();
    const combined = `${moduleName} ${ruleName}`;

    // 2. 扣除项：Clawback、负数金额、或含有扣除/罚款/缺勤等关键字
    if (
      r.status === ProfitShareRecordStatus.CLAWBACK ||
      profitAmount < 0 ||
      /扣|罚|缺勤|迟到|事假|病假|代扣|deduct/.test(combined)
    ) {
      return PayslipItemCategory.DEDUCTION;
    }

    // 3. 各类奖金：含“奖”、“绩效”、“销冠”、“全勤”、“激励”、“分红”等关键字
    if (/奖|绩效|销冠|全勤|激励|优秀|年终|分红|bonus|incentive/.test(combined)) {
      return PayslipItemCategory.BONUS;
    }

    // 4. 津贴补贴：含“补”、“津贴”、“餐”、“车”、“房”、“交通”、“通讯”、“话费”等关键字
    if (/补|津贴|餐|车|房|交通|话费|通讯|差旅|住宿|subsidy|allowance/.test(combined)) {
      return PayslipItemCategory.SUBSIDY;
    }

    // 5. 订单提成：关联订单或 ORDER_PERCENTAGE 规则
    if (r.orderId !== null || r.rule?.ruleType === ProfitShareRuleType.ORDER_PERCENTAGE) {
      return PayslipItemCategory.COMMISSION;
    }

    // 6. 基本底薪/固定课酬：FIXED_MONTHLY 或其他兜底固定薪酬
    return PayslipItemCategory.BASE_SALARY;
  }

  /**
   * 解析月份时间边界
   */
  private getMonthRange(monthStr?: string): { month: string; start: Date; end: Date } {
    let month = monthStr;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    return { month, start, end };
  }

  /**
   * 获取月度工资条列表及月度总览看板
   */
  async getPayslips(query: { month?: string; keyword?: string }) {
    const { month, start, end } = this.getMonthRange(query.month);

    // 查询该月份所有有效分润流水（不包含取消与软删除记录）
    const records = await this.prisma.profitShareRecord.findMany({
      where: {
        status: { not: ProfitShareRecordStatus.CANCELLED },
        deletedAt: null,
        OR: [
          { periodMonth: month },
          {
            periodMonth: null,
            order: {
              financialClosedAt: { gte: start, lte: end },
            },
          },
          {
            periodMonth: null,
            orderId: null,
            createdAt: { gte: start, lte: end },
          },
        ],
      },
      include: {
        rule: true,
        module: true,
        order: true,
      },
    });

    // 按收益成员 memberId 分组
    const memberRecordsMap = new Map<string, typeof records>();
    for (const r of records) {
      if (!memberRecordsMap.has(r.memberId)) {
        memberRecordsMap.set(r.memberId, []);
      }
      memberRecordsMap.get(r.memberId)!.push(r);
    }

    const memberIds = Array.from(memberRecordsMap.keys());
    const users =
      memberIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: memberIds } },
            include: {
              profile: true,
              orgMembers: {
                include: {
                  memberRoles: {
                    include: { role: true },
                  },
                  primaryDept: true,
                },
              },
            },
          })
        : [];

    const userMap = new Map<
      string,
      { name: string; username?: string; role?: string; department?: string; phone?: string }
    >();
    for (const u of users) {
      const name = u.profile?.displayName || u.profile?.fullName || u.username || u.id;
      const roles = u.orgMembers.flatMap((m) => m.memberRoles.map((mr) => mr.role.name));
      const role = roles.length > 0 ? roles[0] : undefined;
      const department = u.orgMembers?.[0]?.primaryDept?.name;
      userMap.set(u.id, {
        name,
        username: u.username,
        role,
        department,
        phone: u.phone || undefined,
      });
    }

    let items: PayslipSummaryItem[] = [];

    for (const [memberId, mRecords] of memberRecordsMap.entries()) {
      const userInfo = userMap.get(memberId);

      let baseSalaryAmount = 0;
      let commissionAmount = 0;
      let bonusAmount = 0;
      let subsidyAmount = 0;
      let deductionAmount = 0;
      let settledAmount = 0;
      let pendingAmount = 0;
      
      const orderIds = new Set<string>();
      let bonusCount = 0;
      let subsidyCount = 0;
      let deductionCount = 0;

      for (const r of mRecords) {
        const category = this.classifyRecord(r);

        switch (category) {
          case PayslipItemCategory.DEDUCTION:
            deductionAmount += Math.abs(r.profitAmount);
            deductionCount += 1;
            break;
          case PayslipItemCategory.BONUS:
            bonusAmount += r.profitAmount;
            bonusCount += 1;
            break;
          case PayslipItemCategory.SUBSIDY:
            subsidyAmount += r.profitAmount;
            subsidyCount += 1;
            break;
          case PayslipItemCategory.COMMISSION:
            commissionAmount += r.profitAmount;
            if (r.orderId) {
              orderIds.add(r.orderId);
            }
            break;
          case PayslipItemCategory.BASE_SALARY:
          default:
            baseSalaryAmount += r.profitAmount;
            break;
        }

        if (r.status === ProfitShareRecordStatus.SETTLED) {
          settledAmount += r.profitAmount;
        } else if (r.status === ProfitShareRecordStatus.PENDING) {
          pendingAmount += r.profitAmount;
        }
      }

      const totalGrossAmount = baseSalaryAmount + commissionAmount + bonusAmount + subsidyAmount - deductionAmount;

      let status: 'SETTLED' | 'PENDING' | 'PARTIALLY_SETTLED' = 'PENDING';
      if (pendingAmount === 0 && settledAmount > 0) {
        status = 'SETTLED';
      } else if (settledAmount > 0 && pendingAmount > 0) {
        status = 'PARTIALLY_SETTLED';
      }

      items.push({
        memberId,
        memberName: userInfo?.name || memberId,
        username: userInfo?.username,
        memberRole: userInfo?.role || '员工',
        departmentName: userInfo?.department,
        phone: userInfo?.phone,
        month,
        baseSalaryAmount,
        commissionAmount,
        bonusAmount,
        subsidyAmount,
        deductionAmount,
        fixedAmount: baseSalaryAmount,
        clawbackAmount: deductionAmount,
        orderCount: orderIds.size,
        bonusCount,
        subsidyCount,
        deductionCount,
        totalGrossAmount,
        settledAmount,
        pendingAmount,
        status,
      });
    }

    // 关键词筛选
    if (query.keyword && query.keyword.trim()) {
      const kw = query.keyword.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.memberName.toLowerCase().includes(kw) ||
          (i.username && i.username.toLowerCase().includes(kw)) ||
          (i.memberRole && i.memberRole.toLowerCase().includes(kw)) ||
          (i.departmentName && i.departmentName.toLowerCase().includes(kw)),
      );
    }

    // 按应发总额从大到小降序排列
    items.sort((a, b) => b.totalGrossAmount - a.totalGrossAmount);

    // 计算月度汇总指标
    const summary: PayslipMonthStats = {
      month,
      totalGrossAmount: items.reduce((sum, i) => sum + i.totalGrossAmount, 0),
      totalBaseSalaryAmount: items.reduce((sum, i) => sum + i.baseSalaryAmount, 0),
      totalCommissionAmount: items.reduce((sum, i) => sum + i.commissionAmount, 0),
      totalBonusAmount: items.reduce((sum, i) => sum + i.bonusAmount, 0),
      totalSubsidyAmount: items.reduce((sum, i) => sum + i.subsidyAmount, 0),
      totalDeductionAmount: items.reduce((sum, i) => sum + i.deductionAmount, 0),
      totalSettledAmount: items.reduce((sum, i) => sum + i.settledAmount, 0),
      totalPendingAmount: items.reduce((sum, i) => sum + i.pendingAmount, 0),
      totalMembers: items.length,
    };

    return {
      month,
      summary,
      items,
    };
  }

  /**
   * 获取单人月度工资条明细
   */
  async getPayslipDetail(memberId: string, monthStr?: string) {
    const { month, start, end } = this.getMonthRange(monthStr);

    const records = await this.prisma.profitShareRecord.findMany({
      where: {
        memberId,
        status: { not: ProfitShareRecordStatus.CANCELLED },
        deletedAt: null,
        OR: [
          { periodMonth: month },
          {
            periodMonth: null,
            order: {
              financialClosedAt: { gte: start, lte: end },
            },
          },
          {
            periodMonth: null,
            orderId: null,
            createdAt: { gte: start, lte: end },
          },
        ],
      },
      include: {
        rule: true,
        module: true,
        order: {
          include: {
            channel: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
      include: {
        profile: true,
        orgMembers: {
          include: {
            memberRoles: { include: { role: true } },
            primaryDept: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`员工 ${memberId} 不存在`);
    }

    const memberName =
      user.profile?.displayName || user.profile?.fullName || user.username || user.id;
    const roles = user.orgMembers.flatMap((m) => m.memberRoles.map((mr) => mr.role.name));
    const memberRole = roles.length > 0 ? roles[0] : '员工';
    const departmentName = user.orgMembers?.[0]?.primaryDept?.name;

    const baseSalaryItems: any[] = [];
    const commissionItems: any[] = [];
    const bonusItems: any[] = [];
    const subsidyItems: any[] = [];
    const deductionItems: any[] = [];

    let baseSalaryAmount = 0;
    let commissionAmount = 0;
    let bonusAmount = 0;
    let subsidyAmount = 0;
    let deductionAmount = 0;
    let settledAmount = 0;
    let pendingAmount = 0;

    for (const r of records) {
      const category = this.classifyRecord(r);

      const formattedRecord = {
        id: r.id,
        ruleName: r.rule?.name || '未知规则',
        moduleName: r.module?.name || '默认款项',
        category,
        baseAmount: r.baseAmount,
        profitAmount: r.profitAmount,
        status: r.status,
        settlementTime: r.settlementTime,
        createdAt: r.createdAt,
        orderNumber: r.order?.orderNumber,
        orderAmount: r.order?.amount,
        channelName: r.order?.channel?.name,
        remark: (r.ruleSnapshot as any)?.remark,
      };

      switch (category) {
        case PayslipItemCategory.DEDUCTION:
          deductionAmount += Math.abs(r.profitAmount);
          deductionItems.push(formattedRecord);
          break;
        case PayslipItemCategory.BONUS:
          bonusAmount += r.profitAmount;
          bonusItems.push(formattedRecord);
          break;
        case PayslipItemCategory.SUBSIDY:
          subsidyAmount += r.profitAmount;
          subsidyItems.push(formattedRecord);
          break;
        case PayslipItemCategory.COMMISSION:
          commissionAmount += r.profitAmount;
          commissionItems.push(formattedRecord);
          break;
        case PayslipItemCategory.BASE_SALARY:
        default:
          baseSalaryAmount += r.profitAmount;
          baseSalaryItems.push(formattedRecord);
          break;
      }

      if (r.status === ProfitShareRecordStatus.SETTLED) {
        settledAmount += r.profitAmount;
      } else if (r.status === ProfitShareRecordStatus.PENDING) {
        pendingAmount += r.profitAmount;
      }
    }

    const totalGrossAmount =
      baseSalaryAmount + commissionAmount + bonusAmount + subsidyAmount - deductionAmount;

    return {
      member: {
        id: user.id,
        name: memberName,
        username: user.username,
        role: memberRole,
        department: departmentName,
        phone: user.phone || undefined,
      },
      month,
      summary: {
        baseSalaryAmount,
        commissionAmount,
        bonusAmount,
        subsidyAmount,
        deductionAmount,
        // 兼容旧字段
        fixedAmount: baseSalaryAmount,
        clawbackAmount: deductionAmount,
        orderCount: commissionItems.length,
        bonusCount: bonusItems.length,
        subsidyCount: subsidyItems.length,
        deductionCount: deductionItems.length,
        totalGrossAmount,
        settledAmount,
        pendingAmount,
      },
      baseSalaryItems,
      commissionItems,
      bonusItems,
      subsidyItems,
      deductionItems,
      // 兼容旧字段
      fixedItems: baseSalaryItems,
      clawbackItems: deductionItems,
    };
  }

  /**
   * 手工录入员工当月薪资调整项（各类奖金、津贴补贴、扣除项等）
   */
  async createAdjustment(dto: CreatePayslipAdjustmentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.memberId },
    });
    if (!user) {
      throw new NotFoundException(`员工 ${dto.memberId} 不存在`);
    }

    // 查找或创建系统调整规则
    let rule = await this.prisma.profitShareRule.findFirst({
      where: { name: '系统薪酬与奖惩调整规则' },
    });
    if (!rule) {
      rule = await this.prisma.profitShareRule.create({
        data: {
          name: '系统薪酬与奖惩调整规则',
          ruleType: ProfitShareRuleType.FIXED_MONTHLY,
          validStartTime: new Date('2020-01-01'),
          validEndTime: new Date('2099-12-31'),
          status: ProfitShareRuleStatus.ACTIVE,
        },
      });
    }

    // 查找或创建款项模块
    let module = await this.prisma.profitShareModule.findFirst({
      where: { ruleId: rule.id, name: dto.name },
    });
    if (!module) {
      module = await this.prisma.profitShareModule.create({
        data: {
          ruleId: rule.id,
          name: dto.name,
          allocationMode: 'FIXED',
        },
      });
    }

    const isDeduction = dto.category === PayslipItemCategory.DEDUCTION;
    const profitAmount = isDeduction ? -Math.abs(dto.amount) : Math.abs(dto.amount);
    const status = isDeduction
      ? ProfitShareRecordStatus.CLAWBACK
      : ProfitShareRecordStatus.PENDING;

    const record = await this.prisma.profitShareRecord.create({
      data: {
        ruleId: rule.id,
        moduleId: module.id,
        memberId: dto.memberId,
        periodMonth: dto.month,
        baseAmount: dto.amount,
        profitAmount,
        status,
        ruleSnapshot: {
          type: 'MANUAL_ADJUSTMENT',
          category: dto.category,
          name: dto.name,
          remark: dto.remark,
        },
      },
    });

    return {
      success: true,
      recordId: record.id,
      message: `成功为员工录入【${dto.name}】`,
    };
  }

  /**
   * 一键结算单人当月所有待结流水
   */
  async settleMemberPayslip(memberId: string, monthStr?: string) {
    const { month, start, end } = this.getMonthRange(monthStr);

    const pendingRecords = await this.prisma.profitShareRecord.findMany({
      where: {
        memberId,
        status: ProfitShareRecordStatus.PENDING,
        deletedAt: null,
        OR: [
          { periodMonth: month },
          {
            periodMonth: null,
            order: {
              financialClosedAt: { gte: start, lte: end },
            },
          },
          {
            periodMonth: null,
            orderId: null,
            createdAt: { gte: start, lte: end },
          },
        ],
      },
      select: { id: true },
    });

    if (pendingRecords.length === 0) {
      return { success: true, count: 0, message: '该员工当月暂无待结算流水' };
    }

    const ids = pendingRecords.map((r) => r.id);
    const updated = await this.prisma.profitShareRecord.updateMany({
      where: { id: { in: ids } },
      data: {
        status: ProfitShareRecordStatus.SETTLED,
        settlementTime: new Date(),
      },
    });

    return {
      success: true,
      count: updated.count,
      message: `成功为员工结算 ${updated.count} 笔流水`,
    };
  }

  /**
   * 导出月度工资条 CSV
   */
  async exportPayslipsCsv(monthStr?: string): Promise<string> {
    const { month, items } = await this.getPayslips({ month: monthStr });

    const headers = [
      '员工姓名',
      '系统账号',
      '岗位角色',
      '所属部门',
      '工资月份',
      '固定底薪/课酬(元)',
      '订单提成(元)',
      '贡献订单数',
      '各类奖金(元)',
      '津贴补贴(元)',
      '各项扣除(元)',
      '应发总额(元)',
      '已发放金额(元)',
      '待结算金额(元)',
      '结算状态',
    ];

    const rows = items.map((item) => [
      `"${item.memberName.replace(/"/g, '""')}"`,
      `"${(item.username || '').replace(/"/g, '""')}"`,
      `"${item.memberRole || ''}"`,
      `"${item.departmentName || ''}"`,
      `"${item.month}"`,
      (item.baseSalaryAmount / 100).toFixed(2),
      (item.commissionAmount / 100).toFixed(2),
      item.orderCount,
      (item.bonusAmount / 100).toFixed(2),
      (item.subsidyAmount / 100).toFixed(2),
      (item.deductionAmount / 100).toFixed(2),
      (item.totalGrossAmount / 100).toFixed(2),
      (item.settledAmount / 100).toFixed(2),
      (item.pendingAmount / 100).toFixed(2),
      item.status === 'SETTLED' ? '全部已结' : item.status === 'PARTIALLY_SETTLED' ? '部分已结' : '待结算',
    ]);

    // UTF-8 BOM (\uFEFF) 防止 Excel 打开中文乱码
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return csvContent;
  }

  /**
   * 获取成员/全员历史过往月份薪资与分润统计数据（供看板统计图表使用）
   */
  async getHistoricalSalaryStats(params?: {
    memberId?: string;
    months?: number;
  }): Promise<HistoricalSalaryStatsResponse> {
    const monthsCount = Math.min(Math.max(Number(params?.months) || 6, 1), 24);
    const now = new Date();

    // 生成从远到近的月份列表，如 ['2026-04', '2026-05', ..., '2026-09']
    const monthList: string[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthList.push(`${y}-${m}`);
    }

    const earliestMonth = monthList[0];
    const latestMonth = monthList[monthList.length - 1];
    const [eY, eM] = earliestMonth.split('-').map(Number);
    const earliestStart = new Date(eY, eM - 1, 1, 0, 0, 0, 0);
    const [lY, lM] = latestMonth.split('-').map(Number);
    const latestEnd = new Date(lY, lM, 0, 23, 59, 59, 999);

    const where: Prisma.ProfitShareRecordWhereInput = {
      deletedAt: null,
      ...(params?.memberId ? { memberId: params.memberId } : {}),
      OR: [
        { periodMonth: { in: monthList } },
        {
          periodMonth: null,
          order: {
            financialClosedAt: { gte: earliestStart, lte: latestEnd },
          },
        },
        {
          periodMonth: null,
          orderId: null,
          createdAt: { gte: earliestStart, lte: latestEnd },
        },
      ],
    };

    const records = await this.prisma.profitShareRecord.findMany({
      where,
      include: {
        rule: true,
        module: true,
        order: {
          select: {
            id: true,
            financialClosedAt: true,
          },
        },
      },
    });

    // 初始化各月数据容器
    const monthDataMap = new Map<
      string,
      {
        baseSalaryAmount: number;
        commissionAmount: number;
        bonusAmount: number;
        subsidyAmount: number;
        deductionAmount: number;
        settledAmount: number;
        pendingAmount: number;
        members: Set<string>;
      }
    >();

    // 针对每个成员的各月数据容器 Map<memberId, Map<month, {...}>>
    const memberMonthDataMap = new Map<
      string,
      Map<
        string,
        {
          baseSalaryAmount: number;
          commissionAmount: number;
          bonusAmount: number;
          subsidyAmount: number;
          deductionAmount: number;
          settledAmount: number;
          pendingAmount: number;
        }
      >
    >();

    for (const m of monthList) {
      monthDataMap.set(m, {
        baseSalaryAmount: 0,
        commissionAmount: 0,
        bonusAmount: 0,
        subsidyAmount: 0,
        deductionAmount: 0,
        settledAmount: 0,
        pendingAmount: 0,
        members: new Set<string>(),
      });
    }

    for (const r of records) {
      let targetMonth: string | undefined;
      if (r.periodMonth && monthDataMap.has(r.periodMonth)) {
        targetMonth = r.periodMonth;
      } else if (r.order?.financialClosedAt) {
        const d = new Date(r.order.financialClosedAt);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthDataMap.has(ym)) targetMonth = ym;
      } else {
        const d = new Date(r.createdAt);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthDataMap.has(ym)) targetMonth = ym;
      }

      if (!targetMonth) continue;

      const data = monthDataMap.get(targetMonth)!;
      data.members.add(r.memberId);

      // 初始化该成员的数据容器
      if (!memberMonthDataMap.has(r.memberId)) {
        const mmap = new Map();
        for (const m of monthList) {
          mmap.set(m, {
            baseSalaryAmount: 0,
            commissionAmount: 0,
            bonusAmount: 0,
            subsidyAmount: 0,
            deductionAmount: 0,
            settledAmount: 0,
            pendingAmount: 0,
          });
        }
        memberMonthDataMap.set(r.memberId, mmap);
      }
      const memData = memberMonthDataMap.get(r.memberId)!.get(targetMonth)!;

      const category = this.classifyRecord(r);
      const profitAmount = r.profitAmount ?? 0;

      switch (category) {
        case PayslipItemCategory.DEDUCTION:
          data.deductionAmount += Math.abs(profitAmount);
          memData.deductionAmount += Math.abs(profitAmount);
          break;
        case PayslipItemCategory.BONUS:
          data.bonusAmount += profitAmount;
          memData.bonusAmount += profitAmount;
          break;
        case PayslipItemCategory.SUBSIDY:
          data.subsidyAmount += profitAmount;
          memData.subsidyAmount += profitAmount;
          break;
        case PayslipItemCategory.COMMISSION:
          data.commissionAmount += profitAmount;
          memData.commissionAmount += profitAmount;
          break;
        case PayslipItemCategory.BASE_SALARY:
        default:
          data.baseSalaryAmount += profitAmount;
          memData.baseSalaryAmount += profitAmount;
          break;
      }

      if (r.status === ProfitShareRecordStatus.SETTLED) {
        data.settledAmount += profitAmount;
        memData.settledAmount += profitAmount;
      } else if (r.status === ProfitShareRecordStatus.PENDING) {
        data.pendingAmount += profitAmount;
        memData.pendingAmount += profitAmount;
      }
    }

    let overallGross = 0;
    let overallSettled = 0;
    let overallPending = 0;
    let maxMonthlyGross = 0;

    let catBaseSalary = 0;
    let catCommission = 0;
    let catBonus = 0;
    let catSubsidy = 0;
    let catDeduction = 0;

    const months: HistoricalMonthPoint[] = monthList.map((m) => {
      const d = monthDataMap.get(m)!;
      const totalGrossAmount =
        d.baseSalaryAmount +
        d.commissionAmount +
        d.bonusAmount +
        d.subsidyAmount -
        d.deductionAmount;

      overallGross += totalGrossAmount;
      overallSettled += d.settledAmount;
      overallPending += d.pendingAmount;
      if (totalGrossAmount > maxMonthlyGross) {
        maxMonthlyGross = totalGrossAmount;
      }

      catBaseSalary += d.baseSalaryAmount;
      catCommission += d.commissionAmount;
      catBonus += d.bonusAmount;
      catSubsidy += d.subsidyAmount;
      catDeduction += d.deductionAmount;

      const [y, mm] = m.split('-');
      const label = `${parseInt(mm, 10)}月`;

      return {
        month: m,
        label,
        baseSalaryAmount: d.baseSalaryAmount,
        commissionAmount: d.commissionAmount,
        bonusAmount: d.bonusAmount,
        subsidyAmount: d.subsidyAmount,
        deductionAmount: d.deductionAmount,
        totalGrossAmount,
        settledAmount: d.settledAmount,
        pendingAmount: d.pendingAmount,
        memberCount: d.members.size,
      };
    });

    const avgMonthlyGross =
      monthList.length > 0 ? Math.round(overallGross / monthList.length) : 0;

    // 获取所有可用员工列表，供前端下拉切换
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        profile: true,
        orgMembers: {
          include: {
            memberRoles: { include: { role: true } },
            primaryDept: true,
          },
        },
      },
      take: 200,
    });

    const members = users.map((u) => {
      const name =
        u.profile?.displayName || u.profile?.fullName || u.username || u.phone || u.id;
      const roles =
        u.orgMembers?.flatMap((m) => m.memberRoles.map((mr) => mr.role.name)) || [];
      const role = roles.length > 0 ? roles[0] : undefined;
      const department = u.orgMembers?.[0]?.primaryDept?.name;
      return {
        id: u.id,
        name,
        role,
        department,
      };
    });

    // 构建每位成员的各月序列对比数据
    const PALETTE = [
      '#1677ff', // 经典蓝
      '#52c41a', // 生机绿
      '#fa8c16', // 活力橙
      '#722ed1', // 高贵紫
      '#13c2c2', // 清新青
      '#eb2f96', // 优雅粉
      '#faad14', // 明亮黄
      '#2f54eb', // 深邃蓝
      '#a0d911', // 青柠绿
      '#fa541c', // 火山红
      '#1890ff',
      '#36cfc9',
    ];

    const memberSeries: MemberHistoricalSeries[] = members.map((mem) => {
      const mmap = memberMonthDataMap.get(mem.id);
      let totalGross = 0;
      let totalSettled = 0;
      let totalPending = 0;

      const monthlyPoints = monthList.map((m) => {
        const d = mmap?.get(m) || {
          baseSalaryAmount: 0,
          commissionAmount: 0,
          bonusAmount: 0,
          subsidyAmount: 0,
          deductionAmount: 0,
          settledAmount: 0,
          pendingAmount: 0,
        };
        const gross =
          d.baseSalaryAmount +
          d.commissionAmount +
          d.bonusAmount +
          d.subsidyAmount -
          d.deductionAmount;
        totalGross += gross;
        totalSettled += d.settledAmount;
        totalPending += d.pendingAmount;

        const [y, mm] = m.split('-');
        return {
          month: m,
          label: `${parseInt(mm, 10)}月`,
          baseSalaryAmount: d.baseSalaryAmount,
          commissionAmount: d.commissionAmount,
          bonusAmount: d.bonusAmount,
          subsidyAmount: d.subsidyAmount,
          deductionAmount: d.deductionAmount,
          totalGrossAmount: gross,
        };
      });

      const avgGross =
        monthList.length > 0 ? Math.round(totalGross / monthList.length) : 0;

      return {
        memberId: mem.id,
        memberName: mem.name,
        memberRole: mem.role,
        departmentName: mem.department,
        color: '#1677ff',
        totalGrossAmount: totalGross,
        totalSettledAmount: totalSettled,
        totalPendingAmount: totalPending,
        avgMonthlyGross: avgGross,
        monthlyPoints,
      };
    });

    // 按实发总额降序排列，并赋予对比色
    memberSeries.sort((a, b) => b.totalGrossAmount - a.totalGrossAmount);
    memberSeries.forEach((ms, idx) => {
      ms.color = PALETTE[idx % PALETTE.length];
    });

    let selectedMember:
      | { id: string; name: string; role?: string; department?: string }
      | undefined;
    if (params?.memberId) {
      selectedMember = members.find((m) => m.id === params.memberId);
    }

    return {
      months,
      overall: {
        totalGrossAmount: overallGross,
        totalSettledAmount: overallSettled,
        totalPendingAmount: overallPending,
        avgMonthlyGross,
        maxMonthlyGross,
      },
      categoryTotals: {
        baseSalaryAmount: catBaseSalary,
        commissionAmount: catCommission,
        bonusAmount: catBonus,
        subsidyAmount: catSubsidy,
        deductionAmount: catDeduction,
      },
      members,
      memberSeries,
      selectedMember,
    };
  }
}

export interface HistoricalMonthPoint {
  month: string;
  label: string;
  baseSalaryAmount: number;
  commissionAmount: number;
  bonusAmount: number;
  subsidyAmount: number;
  deductionAmount: number;
  totalGrossAmount: number;
  settledAmount: number;
  pendingAmount: number;
  memberCount: number;
}

export interface MemberHistoricalSeries {
  memberId: string;
  memberName: string;
  memberRole?: string;
  departmentName?: string;
  color: string;
  totalGrossAmount: number;
  totalSettledAmount: number;
  totalPendingAmount: number;
  avgMonthlyGross: number;
  monthlyPoints: Array<{
    month: string;
    label: string;
    baseSalaryAmount: number;
    commissionAmount: number;
    bonusAmount: number;
    subsidyAmount: number;
    deductionAmount: number;
    totalGrossAmount: number;
  }>;
}

export interface HistoricalSalaryStatsResponse {
  months: HistoricalMonthPoint[];
  overall: {
    totalGrossAmount: number;
    totalSettledAmount: number;
    totalPendingAmount: number;
    avgMonthlyGross: number;
    maxMonthlyGross: number;
  };
  categoryTotals: {
    baseSalaryAmount: number;
    commissionAmount: number;
    bonusAmount: number;
    subsidyAmount: number;
    deductionAmount: number;
  };
  members: Array<{
    id: string;
    name: string;
    role?: string;
    department?: string;
  }>;
  memberSeries: MemberHistoricalSeries[];
  selectedMember?: {
    id: string;
    name: string;
    role?: string;
    department?: string;
  };
}
