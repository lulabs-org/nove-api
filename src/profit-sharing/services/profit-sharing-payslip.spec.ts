/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { ProfitSharingPayslipService } from './profit-sharing-payslip.service';
import { ProfitShareRecordStatus, ProfitShareRuleType } from '@prisma/client';

describe('ProfitSharingPayslipService', () => {
  let payslipService: ProfitSharingPayslipService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      profitShareRecord: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    payslipService = new ProfitSharingPayslipService(prismaService);
  });

  describe('getPayslips', () => {
    it('should aggregate fixed amount, commission, clawbacks and settlement status into monthly payslip', async () => {
      const records = [
        // 教师固定课酬: 5000 元 (已结算)
        {
          id: 'rec-1',
          memberId: 'teacher-1',
          periodMonth: '2026-09',
          profitAmount: 500000,
          status: ProfitShareRecordStatus.SETTLED,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '固定课酬规则',
          },
          module: { name: '固定底薪' },
          order: null,
        },
        // 订单提成: 300 元 (待结算)
        {
          id: 'rec-2',
          memberId: 'teacher-1',
          periodMonth: '2026-09',
          profitAmount: 30000,
          status: ProfitShareRecordStatus.PENDING,
          orderId: 'order-101',
          rule: {
            ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
            name: '9月订单分润规则',
          },
          module: { name: '转化提成' },
          order: { id: 'order-101', orderNumber: 'ORD101' },
        },
        // 退单扣减: -50 元 (已回扣)
        {
          id: 'rec-3',
          memberId: 'teacher-1',
          periodMonth: '2026-09',
          profitAmount: -5000,
          status: ProfitShareRecordStatus.CLAWBACK,
          orderId: 'order-102',
          rule: {
            ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
            name: '9月订单分润规则',
          },
          module: { name: '转化提成' },
          order: { id: 'order-102', orderNumber: 'ORD102' },
        },
      ];

      prismaService.profitShareRecord.findMany.mockResolvedValue(records);
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'teacher-1',
          username: 'teacher_alex',
          phone: '13800001111',
          profile: { displayName: 'Alex老师' },
          orgMembers: [
            {
              memberRoles: [{ role: { name: '授课教师' } }],
              primaryDept: { name: '教学教研部' },
            },
          ],
        },
      ]);

      const res = await payslipService.getPayslips({ month: '2026-09' });

      expect(res.month).toBe('2026-09');
      expect(res.items).toHaveLength(1);

      const payslip = res.items[0];
      expect(payslip.memberName).toBe('Alex老师');
      expect(payslip.memberRole).toBe('授课教师');
      expect(payslip.departmentName).toBe('教学教研部');
      expect(payslip.fixedAmount).toBe(500000); // 5000 元
      expect(payslip.commissionAmount).toBe(30000); // 300 元
      expect(payslip.clawbackAmount).toBe(5000); // 50 元
      expect(payslip.totalGrossAmount).toBe(525000); // 5000 + 300 - 50 = 5250 元
      expect(payslip.settledAmount).toBe(500000); // 5000 元
      expect(payslip.pendingAmount).toBe(30000); // 300 元
      expect(payslip.status).toBe('PARTIALLY_SETTLED'); // 部分已结

      // 验证5大板块新字段
      expect(payslip.baseSalaryAmount).toBe(500000);
      expect(payslip.commissionAmount).toBe(30000);
      expect(payslip.bonusAmount).toBe(0);
      expect(payslip.subsidyAmount).toBe(0);
      expect(payslip.deductionAmount).toBe(5000);

      // 验证月度汇总
      expect(res.summary.totalGrossAmount).toBe(525000);
      expect(res.summary.totalBaseSalaryAmount).toBe(500000);
      expect(res.summary.totalCommissionAmount).toBe(30000);
      expect(res.summary.totalBonusAmount).toBe(0);
      expect(res.summary.totalSubsidyAmount).toBe(0);
      expect(res.summary.totalDeductionAmount).toBe(5000);
      expect(res.summary.totalSettledAmount).toBe(500000);
      expect(res.summary.totalPendingAmount).toBe(30000);
      expect(res.summary.totalMembers).toBe(1);
    });

    it('should correctly classify bonus, subsidy, and attendance deductions', async () => {
      const records = [
        // 底薪: 4000 元
        {
          id: 'r-1',
          memberId: 'emp-1',
          periodMonth: '2026-09',
          profitAmount: 400000,
          status: ProfitShareRecordStatus.SETTLED,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '基本薪资',
          },
          module: { name: '基本底薪' },
        },
        // 餐补 + 交通补贴: 500 元
        {
          id: 'r-2',
          memberId: 'emp-1',
          periodMonth: '2026-09',
          profitAmount: 50000,
          status: ProfitShareRecordStatus.SETTLED,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '全员福利',
          },
          module: { name: '餐费交通补贴' },
        },
        // 9月销冠奖金: 1000 元
        {
          id: 'r-3',
          memberId: 'emp-1',
          periodMonth: '2026-09',
          profitAmount: 100000,
          status: ProfitShareRecordStatus.PENDING,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '激励奖金',
          },
          module: { name: '9月销冠激励奖' },
        },
        // 迟到早退考勤扣款: 100 元
        {
          id: 'r-4',
          memberId: 'emp-1',
          periodMonth: '2026-09',
          profitAmount: -10000,
          status: ProfitShareRecordStatus.CLAWBACK,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '考勤调整',
          },
          module: { name: '迟到事假扣款' },
        },
      ];

      prismaService.profitShareRecord.findMany.mockResolvedValue(records);
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          username: 'jack',
          profile: { displayName: '小李' },
          orgMembers: [],
        },
      ]);

      const res = await payslipService.getPayslips({ month: '2026-09' });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.baseSalaryAmount).toBe(400000); // 4000 元
      expect(item.subsidyAmount).toBe(50000); // 500 元
      expect(item.bonusAmount).toBe(100000); // 1000 元
      expect(item.deductionAmount).toBe(10000); // 100 元
      // 实发合计 = 4000 + 500 + 1000 - 100 = 5400 元 = 540000 分
      expect(item.totalGrossAmount).toBe(540000);
      expect(item.bonusCount).toBe(1);
      expect(item.subsidyCount).toBe(1);
      expect(item.deductionCount).toBe(1);
    });
  });

  describe('settleMemberPayslip', () => {
    it('should settle all pending records for the specified member and month', async () => {
      prismaService.profitShareRecord.findMany.mockResolvedValue([
        { id: 'rec-p1' },
        { id: 'rec-p2' },
      ]);
      prismaService.profitShareRecord.updateMany.mockResolvedValue({
        count: 2,
      });

      const res = await payslipService.settleMemberPayslip(
        'teacher-1',
        '2026-09',
      );

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(prismaService.profitShareRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['rec-p1', 'rec-p2'] } },
          data: expect.objectContaining({
            status: ProfitShareRecordStatus.SETTLED,
          }),
        }),
      );
    });
  });

  describe('getHistoricalSalaryStats', () => {
    it('should generate historical monthly points and aggregate salary categories', async () => {
      const records = [
        {
          id: 'rec-1',
          memberId: 'teacher-1',
          periodMonth: '2026-08',
          profitAmount: 400000,
          status: ProfitShareRecordStatus.SETTLED,
          orderId: null,
          rule: {
            ruleType: ProfitShareRuleType.FIXED_MONTHLY,
            name: '基本底薪',
          },
          module: { name: '基本底薪' },
        },
        {
          id: 'rec-2',
          memberId: 'teacher-1',
          periodMonth: '2026-08',
          profitAmount: 50000,
          status: ProfitShareRecordStatus.SETTLED,
          orderId: null,
          rule: { ruleType: ProfitShareRuleType.FIXED_MONTHLY, name: '餐补' },
          module: { name: '餐费补贴' },
        },
      ];

      prismaService.profitShareRecord.findMany.mockResolvedValue(records);
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'teacher-1',
          username: 'teacher_alex',
          profile: { displayName: 'Alex老师' },
          orgMembers: [],
        },
      ]);

      const res = await payslipService.getHistoricalSalaryStats({ months: 6 });

      expect(res.months).toHaveLength(6);
      expect(res.members).toHaveLength(1);
      expect(res.members[0].name).toBe('Alex老师');
      expect(res.overall.totalGrossAmount).toBe(450000);
      expect(res.categoryTotals.baseSalaryAmount).toBe(400000);
      expect(res.categoryTotals.subsidyAmount).toBe(50000);
    });
  });
});
