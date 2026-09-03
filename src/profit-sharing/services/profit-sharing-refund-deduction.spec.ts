/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import {
  ProfitShareRuleStatus,
  ProfitShareRuleType,
  ProfitShareRecordStatus,
  RefundStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ProfitSharingService } from './profit-sharing.service';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProfitSharing Refund Deduction in Calculations', () => {
  let profitSharingService: ProfitSharingService;
  let ruleRepository: jest.Mocked<ProfitSharingRuleRepository>;
  let recordRepository: jest.Mocked<ProfitSharingRecordRepository>;
  let prismaService: any;

  const mockRule = {
    id: 'rule-order-test',
    name: '2026年9月分润规则',
    ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
    status: ProfitShareRuleStatus.ACTIVE,
    validStartTime: new Date('2026-09-01T00:00:00.000Z'),
    validEndTime: new Date('2026-09-30T23:59:59.999Z'),
    productId: null,
    channelId: null,
    modules: [
      {
        id: 'mod-sales',
        ruleId: 'rule-order-test',
        name: '关单提成 (可退)',
        shareRatio: new Decimal(0.04), // 4%
        isRefundable: true,
        amortizationType: 'NONE',
        allocationMode: 'FIXED',
        allocations: [
          {
            id: 'alloc-1',
            moduleId: 'mod-sales',
            memberId: 'sales-zhang',
            allocationRatio: new Decimal(1.0),
          },
        ],
      },
      {
        id: 'mod-fixed-bonus',
        ruleId: 'rule-order-test',
        name: '技术交付津贴 (不可退)',
        shareRatio: new Decimal(0.02), // 2%
        isRefundable: false,
        amortizationType: 'NONE',
        allocationMode: 'FIXED',
        allocations: [
          {
            id: 'alloc-2',
            moduleId: 'mod-fixed-bonus',
            memberId: 'dev-wang',
            allocationRatio: new Decimal(1.0),
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    ruleRepository = {
      findActiveRulesForOrder: jest.fn().mockResolvedValue([mockRule]),
      findByIdWithDetails: jest.fn().mockResolvedValue(mockRule),
    } as unknown as jest.Mocked<ProfitSharingRuleRepository>;

    recordRepository = {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findRecordsForRefund: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ProfitSharingRecordRepository>;

    prismaService = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      profitShareRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    profitSharingService = new ProfitSharingService(
      prismaService as unknown as PrismaService,
      ruleRepository,
      recordRepository,
    );
  });

  it('should generate explicit CLAWBACK negative record for settled refunds when module isRefundable=true', async () => {
    // 订单总金额 1000 元 (100000 分)，已结算退款 400 元 (40000 分)，待处理退款 100 元 (10000 分，不扣除)
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-part-refund',
      amount: 100000,
      financialClosedAt: new Date('2026-09-15T10:00:00Z'),
      refunds: [
        {
          id: 'ref-1',
          refundAmount: 40000,
          status: RefundStatus.SETTLED,
          deletedAt: null,
        },
        {
          id: 'ref-pending',
          refundAmount: 10000,
          status: RefundStatus.PENDING, // 待处理退款不扣除
          deletedAt: null,
        },
      ],
    });

    await profitSharingService.calculateProfitShare('order-part-refund');

    expect(recordRepository.createMany).toHaveBeenCalledTimes(1);
    const createdData = recordRepository.createMany.mock.calls[0][0]
      .data as any[];

    // 1. 可退模块：正数提成流水 100000 * 4% = 4000 分
    const salesCommission = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.PENDING,
    );
    expect(salesCommission).toBeDefined();
    expect(salesCommission.baseAmount).toBe(100000);
    expect(salesCommission.profitAmount).toBe(4000);

    // 2. 可退模块：显式生成一条已回扣 (CLAWBACK) 负数流水：40000 * 4% = -1600 分 (-16 元)
    const salesClawback = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.CLAWBACK,
    );
    expect(salesClawback).toBeDefined();
    expect(salesClawback.baseAmount).toBe(40000);
    expect(salesClawback.profitAmount).toBe(-1600);

    // 3. 不可退模块：只生成正数提成流水，不生成 CLAWBACK 回扣
    const bonusCommission = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-fixed-bonus' &&
        r.status === ProfitShareRecordStatus.PENDING,
    );
    expect(bonusCommission).toBeDefined();
    expect(bonusCommission.baseAmount).toBe(100000);
    expect(bonusCommission.profitAmount).toBe(2000);

    const bonusClawback = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-fixed-bonus' &&
        r.status === ProfitShareRecordStatus.CLAWBACK,
    );
    expect(bonusClawback).toBeUndefined();
  });

  it('should generate balanced CLAWBACK record for 100% full refund on refundable modules', async () => {
    // 订单总金额 1000 元 (100000 分)，全额退款已结算 1000 元 (100000 分)
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-full-refund',
      amount: 100000,
      financialClosedAt: new Date('2026-09-15T10:00:00Z'),
      refunds: [
        {
          id: 'ref-full',
          refundAmount: 100000,
          status: RefundStatus.SETTLED,
          deletedAt: null,
        },
      ],
    });

    await profitSharingService.calculateProfitShare('order-full-refund');

    expect(recordRepository.createMany).toHaveBeenCalledTimes(1);
    const createdData = recordRepository.createMany.mock.calls[0][0]
      .data as any[];

    // 可退模块正数流水 +4000
    const salesCommission = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.PENDING,
    );
    expect(salesCommission.profitAmount).toBe(4000);

    // 可退模块全额回扣流水 -4000 (净值为 0)
    const salesClawback = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.CLAWBACK,
    );
    expect(salesClawback.profitAmount).toBe(-4000);
    expect(salesCommission.profitAmount + salesClawback.profitAmount).toBe(0);
  });

  it('should generate both commission and CLAWBACK during manual batch recalculation for rule', async () => {
    // 模拟重算查出一条退款订单
    prismaService.order.findMany.mockResolvedValue([
      {
        id: 'order-recalc-1',
        amount: 50000, // 500 元
        financialClosedAt: new Date('2026-09-12T10:00:00Z'),
        refunds: [
          {
            id: 'ref-recalc',
            refundAmount: 20000, // 退 200 元已结算
            status: RefundStatus.SETTLED,
            deletedAt: null,
          },
        ],
      },
    ]);

    const result =
      await profitSharingService.calculateForSpecificRule('rule-order-test');
    expect(result.success).toBe(true);
    expect(result.processedOrders).toBe(1);

    const createdData = recordRepository.createMany.mock.calls[0][0]
      .data as any[];
    // 正数流水 50000 * 4% = 2000 分 (20 元)
    const salesCommission = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.PENDING,
    );
    expect(salesCommission.profitAmount).toBe(2000);

    // 负数回扣流水 - (20000 * 4%) = -800 分 (-8 元)
    const salesClawback = createdData.find(
      (r: any) =>
        r.moduleId === 'mod-sales' &&
        r.status === ProfitShareRecordStatus.CLAWBACK,
    );
    expect(salesClawback.profitAmount).toBe(-800);
  });
});
