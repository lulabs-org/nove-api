/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ProfitSharingService } from './profit-sharing.service';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfitShareRecordStatus, RefundStatus } from '@prisma/client';

describe('ProfitSharingService - Reconciliation Engine', () => {
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
      orderRefund: {
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

    profitSharingService =
      module.get<ProfitSharingService>(ProfitSharingService);
  });

  it('should scan settled refunds and compensate missing clawback records', async () => {
    // 模拟存在一笔已结算退款，退款金额 400 元 (40000 分)
    prismaService.orderRefund.findMany.mockResolvedValue([
      {
        id: 'ref-1',
        afterSaleCode: 'AS-001',
        orderId: 'order-1',
        refundAmount: 40000,
        status: RefundStatus.SETTLED,
        financialSettledAt: new Date('2026-09-02T10:00:00Z'),
        order: {
          id: 'order-1',
          orderNumber: 'ORD-001',
          amount: 100000, // 1000 元
        },
      },
    ]);

    // 订单名下有已发放提成流水 (5000 分，50 元)
    prismaService.profitShareRecord.findMany.mockImplementation((args: any) => {
      if (args?.where?.status?.in) {
        // existing commission check
        return Promise.resolve([
          {
            id: 'rec-1',
            orderId: 'order-1',
            profitAmount: 5000,
            status: ProfitShareRecordStatus.SETTLED,
          },
        ]);
      }
      if (args?.where?.status === ProfitShareRecordStatus.CLAWBACK) {
        // before: no clawback; after: 1 clawback (-2000)
        if (recordRepository.create.mock.calls.length > 0) {
          return Promise.resolve([
            {
              id: 'clawback-1',
              profitAmount: -2000,
              status: ProfitShareRecordStatus.CLAWBACK,
            },
          ]);
        }
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    recordRepository.findRecordsForRefund.mockResolvedValue([
      {
        id: 'rec-1',
        orderId: 'order-1',
        periodMonth: '2026-01',
        ruleId: 'rule-1',
        moduleId: 'mod-1',
        memberId: 'mem-1',
        ruleSnapshot: {},
        baseAmount: 100000,
        profitAmount: 5000,
        status: ProfitShareRecordStatus.SETTLED,
      },
    ]);

    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-1',
      amount: 100000,
    });

    const result = await profitSharingService.reconcileRefundClawbacks();

    expect(result.success).toBe(true);
    expect(result.scannedRefunds).toBe(1);
    expect(result.compensatedOrders).toBe(1);
    expect(result.totalCompensatedAmount).toBe(20); // 2000 分 = 20 元
    expect(result.details.length).toBe(1);
    expect(result.details[0].orderNumber).toBe('ORD-001');
    expect(result.details[0].compensatedAmount).toBe(20);

    // 验证调用了 create 补充生成 CLAWBACK 记录
    expect(recordRepository.create).toHaveBeenCalledTimes(1);
    expect(recordRepository.create.mock.calls[0][0].data.status).toBe(
      ProfitShareRecordStatus.CLAWBACK,
    );
    expect(recordRepository.create.mock.calls[0][0].data.profitAmount).toBe(
      -2000,
    );
  });

  it('should not compensate when clawback is already complete', async () => {
    prismaService.orderRefund.findMany.mockResolvedValue([
      {
        id: 'ref-already',
        afterSaleCode: 'AS-002',
        orderId: 'order-2',
        refundAmount: 50000,
        status: RefundStatus.SETTLED,
        financialSettledAt: new Date('2026-09-02T10:00:00Z'),
        order: {
          id: 'order-2',
          orderNumber: 'ORD-002',
          amount: 100000,
        },
      },
    ]);

    // 历史已有 2500 分 CLAWBACK
    prismaService.profitShareRecord.findMany.mockResolvedValue([
      {
        id: 'c-1',
        profitAmount: -2500,
        status: ProfitShareRecordStatus.CLAWBACK,
      },
    ]);

    recordRepository.findRecordsForRefund.mockResolvedValue([
      {
        id: 'rec-2',
        orderId: 'order-2',
        profitAmount: 5000,
        status: ProfitShareRecordStatus.SETTLED,
      },
    ]);

    prismaService.order.findUnique.mockResolvedValue({
      id: 'order-2',
      amount: 100000,
    });

    const result = await profitSharingService.reconcileRefundClawbacks();

    expect(result.success).toBe(true);
    expect(result.scannedRefunds).toBe(1);
    expect(result.compensatedOrders).toBe(0);
    expect(result.totalCompensatedAmount).toBe(0);
    expect(recordRepository.create).not.toHaveBeenCalled();
  });
});
