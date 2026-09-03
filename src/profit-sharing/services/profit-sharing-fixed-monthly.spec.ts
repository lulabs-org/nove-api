/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import {
  ProfitShareRuleStatus,
  ProfitShareRuleType,
  ProfitShareRecordStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ProfitSharingRuleService } from './profit-sharing-rule.service';
import { ProfitSharingService } from './profit-sharing.service';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProfitSharing Fixed Monthly Payout', () => {
  let ruleService: ProfitSharingRuleService;
  let ruleRepository: jest.Mocked<ProfitSharingRuleRepository>;

  let profitSharingService: ProfitSharingService;
  let recordRepository: jest.Mocked<ProfitSharingRecordRepository>;
  let prismaService: any;

  beforeEach(() => {
    ruleRepository = {
      createWithDetails: jest.fn(),
      updateWithDetails: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findAllWithDetails: jest.fn(),
      findActiveRulesForOrder: jest.fn(),
    } as unknown as jest.Mocked<ProfitSharingRuleRepository>;

    ruleService = new ProfitSharingRuleService(ruleRepository);

    recordRepository = {
      createMany: jest.fn(),
      findRecordsWithDetails: jest.fn(),
      countRecords: jest.fn(),
      findRecordsForRefund: jest.fn(),
      updatePendingRecordsToSettled: jest.fn(),
    } as unknown as jest.Mocked<ProfitSharingRecordRepository>;

    prismaService = {
      profitShareRecord: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    profitSharingService = new ProfitSharingService(
      prismaService as unknown as PrismaService,
      ruleRepository,
      recordRepository,
    );
  });

  describe('Rule Creation', () => {
    it('should successfully create a FIXED_MONTHLY rule without productId or channelId', async () => {
      ruleRepository.createWithDetails.mockResolvedValue({
        id: 'rule-fixed-1',
        name: '2026年9月教师固定课酬规则',
        ruleType: ProfitShareRuleType.FIXED_MONTHLY,
        productId: null,
        channelId: null,
        validStartTime: new Date('2026-09-01T00:00:00.000Z'),
        validEndTime: new Date('2026-09-30T23:59:59.999Z'),
        status: ProfitShareRuleStatus.ACTIVE,
        modules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await ruleService.createRule({
        name: '2026年9月教师固定课酬规则',
        ruleType: ProfitShareRuleType.FIXED_MONTHLY,
        validStartTime: '2026-09-01T00:00:00.000Z',
        validEndTime: '2026-09-30T23:59:59.999Z',
        status: ProfitShareRuleStatus.ACTIVE,
        modules: [
          {
            name: '教师固定课酬',
            fixedAmount: 500000,
            allocations: [
              {
                memberId: 'teacher-zhang',
                fixedAmount: 500000,
              },
            ],
          },
        ],
      });

      expect(ruleRepository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '2026年9月教师固定课酬规则',
          ruleType: ProfitShareRuleType.FIXED_MONTHLY,
          modules: {
            create: [
              expect.objectContaining({
                name: '教师固定课酬',
                fixedAmount: 500000,
                allocations: {
                  create: [
                    expect.objectContaining({
                      memberId: 'teacher-zhang',
                      fixedAmount: 500000,
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      );
      expect(result.id).toBe('rule-fixed-1');
    });

    it('should throw BadRequestException if ORDER_PERCENTAGE rule lacks both productId and channelId', async () => {
      await expect(
        ruleService.createRule({
          name: '普通分润规则',
          ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
          validStartTime: '2026-09-01T00:00:00.000Z',
          validEndTime: '2026-09-30T23:59:59.999Z',
          modules: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Fixed Monthly Calculation', () => {
    it('should generate 5000 fixed profit sharing records for matching months', async () => {
      const fixedRule = {
        id: 'rule-fixed-1',
        name: '教师固定月薪规则',
        ruleType: ProfitShareRuleType.FIXED_MONTHLY,
        status: ProfitShareRuleStatus.ACTIVE,
        validStartTime: new Date('2026-09-01T00:00:00.000+08:00'),
        validEndTime: new Date('2026-10-31T23:59:59.999+08:00'),
        productId: null,
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        modules: [
          {
            id: 'mod-1',
            ruleId: 'rule-fixed-1',
            name: '教师月度课酬',
            shareRatio: new Decimal(0),
            fixedAmount: 500000,
            isRefundable: false,
            amortizationType: 'NONE',
            allocationMode: 'FIXED',
            createdAt: new Date(),
            updatedAt: new Date(),
            allocations: [
              {
                id: 'alloc-1',
                moduleId: 'mod-1',
                memberId: 'teacher-wang',
                roleId: null,
                allocationRatio: new Decimal(1),
                fixedAmount: 500000,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
      };

      ruleRepository.findByIdWithDetails.mockResolvedValue(fixedRule);
      // No existing records
      prismaService.profitShareRecord.findFirst.mockResolvedValue(null);
      recordRepository.createMany.mockResolvedValue({ count: 2 });

      const res =
        await profitSharingService.calculateForSpecificRule('rule-fixed-1');

      expect(res.success).toBe(true);
      expect(res.processedOrders).toBe(2); // 2 months (2026-09, 2026-10)
      expect(recordRepository.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            orderId: null,
            periodMonth: '2026-09',
            memberId: 'teacher-wang',
            profitAmount: 500000, // 5000 元
            baseAmount: 500000,
            status: ProfitShareRecordStatus.PENDING,
          }),
          expect.objectContaining({
            orderId: null,
            periodMonth: '2026-10',
            memberId: 'teacher-wang',
            profitAmount: 500000,
            baseAmount: 500000,
            status: ProfitShareRecordStatus.PENDING,
          }),
        ]),
      });
    });

    it('should be idempotent and not duplicate already generated monthly fixed records', async () => {
      const fixedRule = {
        id: 'rule-fixed-1',
        name: '教师固定月薪规则',
        ruleType: ProfitShareRuleType.FIXED_MONTHLY,
        status: ProfitShareRuleStatus.ACTIVE,
        validStartTime: new Date('2026-09-01T00:00:00.000Z'),
        validEndTime: new Date('2026-09-30T23:59:59.999Z'),
        productId: null,
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        modules: [
          {
            id: 'mod-1',
            ruleId: 'rule-fixed-1',
            name: '教师月度课酬',
            shareRatio: new Decimal(0),
            fixedAmount: 500000,
            isRefundable: false,
            amortizationType: 'NONE',
            allocationMode: 'FIXED',
            createdAt: new Date(),
            updatedAt: new Date(),
            allocations: [
              {
                id: 'alloc-1',
                moduleId: 'mod-1',
                memberId: 'teacher-wang',
                roleId: null,
                allocationRatio: new Decimal(1),
                fixedAmount: 500000,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
      };

      ruleRepository.findByIdWithDetails.mockResolvedValue(fixedRule);
      // Simulate that 2026-09 record already exists
      prismaService.profitShareRecord.findFirst.mockResolvedValue({
        id: 'rec-existing-1',
        periodMonth: '2026-09',
        status: ProfitShareRecordStatus.PENDING,
      });

      const res =
        await profitSharingService.calculateForSpecificRule('rule-fixed-1');

      expect(res.success).toBe(true);
      expect(res.processedOrders).toBe(0); // 0 new records created
      expect(recordRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Order Personnel Allocation (ORDER_OWNER & FINANCIAL_CLOSER)', () => {
    it('should assign commission to order currentOwnerId dynamically for operations module', async () => {
      const orderRule = {
        id: 'rule-order-1',
        name: '课程销售与运营分润规则',
        ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
        status: ProfitShareRuleStatus.ACTIVE,
        validStartTime: new Date('2026-09-01T00:00:00.000+08:00'),
        validEndTime: new Date('2026-09-30T23:59:59.999+08:00'),
        productId: 'prod-english-1',
        channelId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        modules: [
          {
            id: 'mod-ops',
            ruleId: 'rule-order-1',
            name: '运营跟单',
            shareRatio: new Decimal(0.03), // 3%
            fixedAmount: null,
            allocationMode: 'ORDER_OWNER', // 随订单负责人
            isRefundable: true,
            amortizationType: 'NONE',
            allocations: [
              {
                id: 'alloc-fallback',
                moduleId: 'mod-ops',
                memberId: 'supervisor-fallback',
                roleId: null,
                allocationRatio: new Decimal(1),
                fixedAmount: null,
              },
            ],
          },
          {
            id: 'mod-closer',
            ruleId: 'rule-order-1',
            name: '关单销售',
            shareRatio: new Decimal(0.04), // 4%
            fixedAmount: null,
            allocationMode: 'FINANCIAL_CLOSER', // 随订单关单人
            isRefundable: true,
            amortizationType: 'NONE',
            allocations: [],
          },
        ],
      };

      const order1 = {
        id: 'order-1001',
        orderNumber: 'ORD1001',
        amount: 100000, // 1000 元 (100000 分)
        productId: 'prod-english-1',
        channelId: 1,
        currentOwnerId: 'operator-zhang', // 张运营
        financialCloserId: 'sales-li', // 李销售
        financialClosedAt: new Date('2026-09-10T12:00:00.000+08:00'),
      };

      prismaService.order.findUnique.mockResolvedValue(order1);
      ruleRepository.findActiveRulesForOrder.mockResolvedValue([
        orderRule as any,
      ]);
      recordRepository.createMany.mockResolvedValue({ count: 2 });

      await profitSharingService.calculateProfitShare('order-1001');

      expect(recordRepository.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          // 运营跟单 3% -> 3000 分 (30 元) 自动归属 张运营 (operator-zhang)
          expect.objectContaining({
            orderId: 'order-1001',
            moduleId: 'mod-ops',
            memberId: 'operator-zhang',
            profitAmount: 3000,
            baseAmount: 100000,
            status: ProfitShareRecordStatus.PENDING,
          }),
          // 关单销售 4% -> 4000 分 (40 元) 自动归属 李销售 (sales-li)
          expect.objectContaining({
            orderId: 'order-1001',
            moduleId: 'mod-closer',
            memberId: 'sales-li',
            profitAmount: 4000,
            baseAmount: 100000,
            status: ProfitShareRecordStatus.PENDING,
          }),
        ]),
      });
    });

    it('should fallback to default member when order currentOwnerId is missing', async () => {
      const orderRule = {
        id: 'rule-order-1',
        name: '运营分润规则',
        ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
        status: ProfitShareRuleStatus.ACTIVE,
        validStartTime: new Date('2026-09-01T00:00:00.000+08:00'),
        validEndTime: new Date('2026-09-30T23:59:59.999+08:00'),
        productId: 'prod-english-1',
        channelId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        modules: [
          {
            id: 'mod-ops',
            ruleId: 'rule-order-1',
            name: '运营跟单',
            shareRatio: new Decimal(0.05), // 5%
            fixedAmount: null,
            allocationMode: 'ORDER_OWNER',
            isRefundable: true,
            amortizationType: 'NONE',
            allocations: [
              {
                id: 'alloc-fallback',
                moduleId: 'mod-ops',
                memberId: 'supervisor-fallback',
                roleId: null,
                allocationRatio: new Decimal(1),
                fixedAmount: null,
              },
            ],
          },
        ],
      };

      const orderWithoutOwner = {
        id: 'order-1002',
        orderNumber: 'ORD1002',
        amount: 200000, // 2000 元
        productId: 'prod-english-1',
        channelId: 1,
        currentOwnerId: null, // 无指定负责人
        financialCloserId: null,
        financialClosedAt: new Date('2026-09-12T12:00:00.000+08:00'),
      };

      prismaService.order.findUnique.mockResolvedValue(orderWithoutOwner);
      ruleRepository.findActiveRulesForOrder.mockResolvedValue([
        orderRule as any,
      ]);
      recordRepository.createMany.mockResolvedValue({ count: 1 });

      await profitSharingService.calculateProfitShare('order-1002');

      expect(recordRepository.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          // 降级归属于兜底人员 supervisor-fallback
          expect.objectContaining({
            orderId: 'order-1002',
            moduleId: 'mod-ops',
            memberId: 'supervisor-fallback',
            profitAmount: 10000,
          }),
        ]),
      });
    });
  });

  describe('Rule Duplication (Single & Batch)', () => {
    it('should duplicate a single rule with all modules and allocations intact', async () => {
      const sourceRule = {
        id: 'rule-src-1',
        name: '英语营9月分润规则',
        ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
        productId: 'prod-1',
        channelId: 1,
        validStartTime: new Date('2026-09-01T00:00:00.000+08:00'),
        validEndTime: new Date('2026-09-30T23:59:59.999+08:00'),
        status: ProfitShareRuleStatus.ACTIVE,
        modules: [
          {
            name: '运营跟单',
            shareRatio: new Decimal(0.03),
            fixedAmount: null,
            isRefundable: true,
            amortizationType: 'NONE',
            allocationMode: 'ORDER_OWNER',
            allocations: [
              {
                memberId: 'supervisor-fallback',
                roleId: null,
                allocationRatio: new Decimal(1),
                fixedAmount: null,
              },
            ],
          },
        ],
      };

      ruleRepository.findByIdWithDetails.mockResolvedValue(sourceRule as any);
      (ruleRepository.createWithDetails as any).mockImplementation(
        (data: any) => Promise.resolve({ id: 'rule-dup-1', ...data }),
      );

      const duplicated = await ruleService.duplicateRule('rule-src-1');

      expect(ruleRepository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '英语营9月分润规则 (副本)',
          ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
          status: ProfitShareRuleStatus.ACTIVE,
          modules: {
            create: [
              expect.objectContaining({
                name: '运营跟单',
                allocationMode: 'ORDER_OWNER',
                allocations: {
                  create: [
                    expect.objectContaining({
                      memberId: 'supervisor-fallback',
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      );
      expect(duplicated.id).toBe('rule-dup-1');
    });

    it('should batch duplicate rules with smart NEXT_MONTH shift and auto month naming', async () => {
      const sourceRule = {
        id: 'rule-src-1',
        name: '2026年9月会员分润规则',
        ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
        productId: 'prod-1',
        channelId: 1,
        validStartTime: new Date('2026-09-01T00:00:00.000+08:00'),
        validEndTime: new Date('2026-09-30T23:59:59.999+08:00'),
        status: ProfitShareRuleStatus.ACTIVE,
        modules: [
          {
            name: '关单',
            shareRatio: new Decimal(0.04),
            fixedAmount: null,
            isRefundable: true,
            amortizationType: 'NONE',
            allocationMode: 'FINANCIAL_CLOSER',
            allocations: [],
          },
        ],
      };

      ruleRepository.findByIdWithDetails.mockResolvedValue(sourceRule as any);
      (ruleRepository.createWithDetails as any).mockImplementation(
        (data: any) => Promise.resolve({ id: 'rule-dup-2', ...data }),
      );

      const res = await ruleService.batchDuplicateRules({
        ruleIds: ['rule-src-1'],
        periodStrategy: 'NEXT_MONTH',
        status: ProfitShareRuleStatus.ACTIVE,
      });

      expect(res.duplicatedCount).toBe(1);
      expect(ruleRepository.createWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '2026年10月会员分润规则', // 智能替换 9月 -> 10月
          ruleType: ProfitShareRuleType.ORDER_PERCENTAGE,
          modules: {
            create: [
              expect.objectContaining({
                name: '关单',
                allocationMode: 'FINANCIAL_CLOSER',
              }),
            ],
          },
        }),
      );
    });
  });
});
