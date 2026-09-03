import { Test, TestingModule } from '@nestjs/testing';
import { ProfitSharingService } from './profit-sharing.service';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfitShareRecordStatus } from '@prisma/client';

describe('ProfitSharingService - Cross Period and Incremental Refunds', () => {
  let profitSharingService: ProfitSharingService;
  let prismaService: any;
  let recordRepository: any;
  let ruleRepository: any;

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      profitShareRecord: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    recordRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      findRecordsForRefund: jest.fn(),
    };

    ruleRepository = {
      findActiveRulesForOrder: jest.fn(),
      findByIdWithDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitSharingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ProfitSharingRuleRepository, useValue: ruleRepository },
        { provide: ProfitSharingRecordRepository, useValue: recordRepository },
      ],
    }).compile();

    profitSharingService = module.get<ProfitSharingService>(ProfitSharingService);
  });

  it('should assign periodMonth to August when January settled order is refunded in August', async () => {
    // 1月订单：总额 1000 元 (100000 分)
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-jan-1',
      amount: 100000,
      financialClosedAt: new Date('2026-01-15T10:00:00Z'),
    });

    // 1月份已结算的提成流水 (SETTLED, ¥40)
    recordRepository.findRecordsForRefund.mockResolvedValue([
      {
        id: 'rec-jan-sales',
        orderId: 'order-jan-1',
        periodMonth: '2026-01',
        ruleId: 'rule-2026-01',
        moduleId: 'mod-sales',
        memberId: 'member-zhangsan',
        ruleSnapshot: { name: '1月销售规则' },
        baseAmount: 100000,
        profitAmount: 4000,
        status: ProfitShareRecordStatus.SETTLED,
      },
    ]);

    // 历史没有已存在的 CLAWBACK
    prismaService.profitShareRecord.findMany.mockResolvedValue([]);

    // 8月20日 发生全额退款 100000 分已结算
    const augustSettledAt = new Date('2026-08-20T14:30:00Z');
    await profitSharingService.handleRefundClawback(
      'order-jan-1',
      100000,
      augustSettledAt,
    );

    expect(recordRepository.create).toHaveBeenCalledTimes(1);
    const createdArgs = recordRepository.create.mock.calls[0][0].data;

    // 核心验证：账期必须是 2026-08，绝不能污染 1 月历史
    expect(createdArgs.periodMonth).toBe('2026-08');
    expect(createdArgs.profitAmount).toBe(-4000);
    expect(createdArgs.status).toBe(ProfitShareRecordStatus.CLAWBACK);
    expect(createdArgs.settlementTime).toEqual(augustSettledAt);
  });

  it('should accurately calculate incremental clawback for multi-stage partial refunds', async () => {
    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-multi-stage',
      amount: 100000,
    });

    recordRepository.findRecordsForRefund.mockResolvedValue([
      {
        id: 'rec-sales',
        orderId: 'order-multi-stage',
        periodMonth: '2026-01',
        ruleId: 'rule-1',
        moduleId: 'mod-sales',
        memberId: 'member-lisi',
        ruleSnapshot: {},
        baseAmount: 100000,
        profitAmount: 5000, // 5000 分 (50 元)
        status: ProfitShareRecordStatus.SETTLED,
      },
    ]);

    // 第一笔退款：3月退 40% (40000 分)
    prismaService.profitShareRecord.findMany.mockResolvedValueOnce([]); // 尚无已存在回扣
    await profitSharingService.handleRefundClawback(
      'order-multi-stage',
      40000,
      new Date('2026-03-10T10:00:00Z'),
    );

    expect(recordRepository.create).toHaveBeenCalledTimes(1);
    const firstClawback = recordRepository.create.mock.calls[0][0].data;
    // 5000 * 40% = 2000 分 (20 元)
    expect(firstClawback.periodMonth).toBe('2026-03');
    expect(firstClawback.profitAmount).toBe(-2000);

    // 第二笔退款：8月累计退款达到 100% (100000 分)
    // 此时查询已存在的 CLAWBACK 会查到第一笔的 -2000 分
    prismaService.profitShareRecord.findMany.mockResolvedValueOnce([
      {
        id: 'clawback-1',
        profitAmount: -2000,
        status: ProfitShareRecordStatus.CLAWBACK,
      },
    ]);

    await profitSharingService.handleRefundClawback(
      'order-multi-stage',
      100000,
      new Date('2026-08-15T10:00:00Z'),
    );

    expect(recordRepository.create).toHaveBeenCalledTimes(2);
    const secondClawback = recordRepository.create.mock.calls[1][0].data;
    // 总目标扣减 5000 分，历史已扣 2000 分，本次增量补扣 -3000 分
    expect(secondClawback.periodMonth).toBe('2026-08');
    expect(secondClawback.profitAmount).toBe(-3000);

    // 第三次重复调用相同退款（100000 分）：已扣 5000 分，增量为 0，不产生多余流水
    prismaService.profitShareRecord.findMany.mockResolvedValueOnce([
      { id: 'clawback-1', profitAmount: -2000, status: ProfitShareRecordStatus.CLAWBACK },
      { id: 'clawback-2', profitAmount: -3000, status: ProfitShareRecordStatus.CLAWBACK },
    ]);

    await profitSharingService.handleRefundClawback(
      'order-multi-stage',
      100000,
      new Date('2026-08-15T10:00:00Z'),
    );

    // 次数依然保持为 2，没有多余生成
    expect(recordRepository.create).toHaveBeenCalledTimes(2);
  });
});
