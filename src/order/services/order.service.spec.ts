/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { BenefitAdjustmentType, Currency, OrderStatus } from '@prisma/client';
import {
  OrderBenefitAdjustmentWithOperator,
  OrderRepository,
  OrderWithRelations,
} from '../repositories/order.repository';
import { OrderService } from './order.service';

const now = new Date('2024-06-01T00:00:00.000Z');

const mockOrder = (
  overrides: Partial<OrderWithRelations> = {},
): OrderWithRelations => ({
  id: 'order-1',
  orderCode: 'ORD20240101001',
  orderNumber: '2024010110001',
  externalId: null,
  metadata: null,
  productId: 'prod-1',
  productName: '年度会员',
  purchaserId: 'user-1',
  channelId: 1,
  email: 'test@example.com',
  phone: '13800000000',
  phoneCode: '+86',
  currentOwnerId: null,
  financialCloserId: null,
  financialClosedAt: null,
  amount: 36500,
  currency: Currency.CNY,
  amountCny: 36500,
  fxRateToCny: null,
  fxLockedAt: null,
  status: OrderStatus.PAID,
  paidAt: new Date('2024-01-01T00:00:00.000Z'),
  cancelledAt: null,
  completedAt: null,
  durationDays: 365,
  benefitStart: new Date('2024-01-01T00:00:00.000Z'),
  benefitEnd: new Date('2024-12-31T00:00:00.000Z'),
  frozenDays: 0,
  frozenAt: null,
  paymentProvider: null,
  providerTradeNo: null,
  product: { id: 'prod-1', productCode: 'P-VIP', name: '年度会员' },
  purchaser: {
    id: 'user-1',
    username: 'vip_user',
    email: 'test@example.com',
    profile: { displayName: 'VIP用户' },
  },
  channel: { id: 1, code: 'OFFLINE', name: '线下' },
  currentOwner: null,
  financialCloser: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('OrderService - Benefit Freeze, Unfreeze & Extension', () => {
  let repository: jest.Mocked<OrderRepository>;
  let service: OrderService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByOrderCode: jest.fn(),
      findByOrderNumber: jest.fn(),
      findByChannelIdAndExternalId: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      productExists: jest.fn(),
      findProductById: jest.fn(),
      userExists: jest.fn(),
      channelExists: jest.fn(),
      executeBenefitAdjustment: jest.fn(),
      findBenefitAdjustments: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    service = new OrderService(repository);
  });

  describe('freeze', () => {
    it('successfully freezes a PAID order and records adjustment', async () => {
      // Set benefitEnd in future
      const futureEnd = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
      const order = mockOrder({
        benefitEnd: futureEnd,
        status: OrderStatus.PAID,
      });
      repository.findById.mockResolvedValue(order);

      const frozenOrder = mockOrder({
        ...order,
        status: OrderStatus.FROZEN,
        frozenAt: new Date(),
      });
      repository.executeBenefitAdjustment.mockResolvedValue({
        order: frozenOrder,
        adjustment: {
          id: 'adj-1',
          orderId: order.id,
          type: BenefitAdjustmentType.FREEZE,
          days: 0,
          freezeStart: new Date(),
          freezeEnd: null,
          beforeEnd: futureEnd,
          afterEnd: futureEnd,
          reason: '学员出国交流',
          operatorId: 'admin-1',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          operator: null,
        },
      });

      repository.userExists.mockResolvedValue(true);

      const result = await service.freeze(
        order.id,
        { reason: '学员出国交流' },
        'admin-1',
      );

      expect(repository.executeBenefitAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.id,
          orderUpdate: expect.objectContaining({
            status: OrderStatus.FROZEN,
            frozenAt: expect.any(Date),
          }),
          adjustmentCreate: expect.objectContaining({
            type: BenefitAdjustmentType.FREEZE,
            reason: '学员出国交流',
          }),
        }),
      );
      expect(result.status).toBe(OrderStatus.FROZEN);
    });

    it('rejects freezing an already FROZEN or UNPAID order', async () => {
      const order = mockOrder({ status: OrderStatus.FROZEN });
      repository.findById.mockResolvedValue(order);

      await expect(
        service.freeze(order.id, { reason: '重复冻结' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects freezing an expired order', async () => {
      const order = mockOrder({
        status: OrderStatus.PAID,
        benefitEnd: new Date('2020-01-01T00:00:00.000Z'),
      });
      repository.findById.mockResolvedValue(order);

      await expect(
        service.freeze(order.id, { reason: '已过期' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('unfreeze', () => {
    it('unfreezes a FROZEN order, extends benefitEnd by elapsed days, and restores PAID status', async () => {
      // Frozen ~35.5 days ago (Math.ceil produces exactly 36 days regardless of execution latency)
      const frozenAt = new Date(
        Date.now() - (35 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      );
      const originalEnd = new Date('2024-12-31T00:00:00.000Z');
      const order = mockOrder({
        status: OrderStatus.FROZEN,
        frozenAt,
        benefitEnd: originalEnd,
        frozenDays: 0,
      });
      repository.findById.mockResolvedValue(order);

      const unfrozenOrder = mockOrder({
        ...order,
        status: OrderStatus.PAID,
        frozenAt: null,
        frozenDays: 36,
        benefitEnd: new Date(originalEnd.getTime() + 36 * 24 * 60 * 60 * 1000),
      });

      repository.executeBenefitAdjustment.mockResolvedValue({
        order: unfrozenOrder,
        adjustment: {
          id: 'adj-2',
          orderId: order.id,
          type: BenefitAdjustmentType.UNFREEZE,
          days: 36,
          freezeStart: frozenAt,
          freezeEnd: new Date(),
          beforeEnd: originalEnd,
          afterEnd: unfrozenOrder.benefitEnd!,
          reason: '返校恢复学习',
          operatorId: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          operator: null,
        },
      });

      const result = await service.unfreeze(order.id, {
        reason: '返校恢复学习',
      });

      expect(repository.executeBenefitAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.id,
          orderUpdate: expect.objectContaining({
            status: OrderStatus.PAID,
            frozenAt: null,
            frozenDays: 36,
          }),
          adjustmentCreate: expect.objectContaining({
            type: BenefitAdjustmentType.UNFREEZE,
            days: 36,
          }),
        }),
      );
      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.frozenDays).toBe(36);
    });

    it('rejects unfreezing a non-frozen order', async () => {
      const order = mockOrder({ status: OrderStatus.PAID, frozenAt: null });
      repository.findById.mockResolvedValue(order);

      await expect(
        service.unfreeze(order.id, { reason: '未处于冻结状态' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('extend', () => {
    it('extends order validity by specified days and records EXTENSION adjustment', async () => {
      const originalEnd = new Date('2024-12-31T00:00:00.000Z');
      const order = mockOrder({
        status: OrderStatus.PAID,
        benefitEnd: originalEnd,
      });
      repository.findById.mockResolvedValue(order);

      const extendedEnd = new Date(
        originalEnd.getTime() + 36 * 24 * 60 * 60 * 1000,
      );
      const extendedOrder = mockOrder({
        ...order,
        benefitEnd: extendedEnd,
      });

      repository.executeBenefitAdjustment.mockResolvedValue({
        order: extendedOrder,
        adjustment: {
          id: 'adj-3',
          orderId: order.id,
          type: BenefitAdjustmentType.EXTENSION,
          days: 36,
          freezeStart: null,
          freezeEnd: null,
          beforeEnd: originalEnd,
          afterEnd: extendedEnd,
          reason: '系统故障补偿36天',
          operatorId: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          operator: null,
        },
      });

      const result = await service.extend(order.id, {
        days: 36,
        reason: '系统故障补偿36天',
      });

      expect(repository.executeBenefitAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.id,
          orderUpdate: expect.objectContaining({
            benefitEnd: expect.any(Date),
          }),
          adjustmentCreate: expect.objectContaining({
            type: BenefitAdjustmentType.EXTENSION,
            days: 36,
            reason: '系统故障补偿36天',
          }),
        }),
      );
      expect(result.benefitEnd).toEqual(extendedEnd);
    });

    it('rejects non-positive extension days', async () => {
      const order = mockOrder({ status: OrderStatus.PAID });
      repository.findById.mockResolvedValue(order);

      await expect(
        service.extend(order.id, { days: 0, reason: '非法天数' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getBenefitAdjustments', () => {
    it('returns formatted adjustments for order', async () => {
      const order = mockOrder();
      repository.findById.mockResolvedValue(order);

      const adjustments: OrderBenefitAdjustmentWithOperator[] = [
        {
          id: 'adj-1',
          orderId: order.id,
          type: BenefitAdjustmentType.FREEZE,
          days: 0,
          freezeStart: now,
          freezeEnd: null,
          beforeEnd: order.benefitEnd!,
          afterEnd: order.benefitEnd!,
          reason: '冻结',
          operatorId: 'admin-1',
          metadata: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          operator: {
            id: 'admin-1',
            username: 'admin',
            email: 'admin@example.com',
            profile: { displayName: '系统管理员' },
          },
        },
      ];
      repository.findBenefitAdjustments.mockResolvedValue(adjustments);

      const result = await service.getBenefitAdjustments(order.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'adj-1',
        type: BenefitAdjustmentType.FREEZE,
        operator: expect.objectContaining({
          name: '系统管理员',
        }),
      });
    });
  });

  describe('create with durationDays', () => {
    it('inherits durationDays from product and calculates benefitEnd when not provided', async () => {
      repository.findByOrderCode.mockResolvedValue(null);
      repository.findByOrderNumber.mockResolvedValue(null);
      repository.productExists.mockResolvedValue(true);
      repository.findProductById.mockResolvedValue({
        id: 'prod-1',
        name: '年度会员',
        durationDays: 365,
      });

      const startDate = '2026-01-01T00:00:00.000Z';
      const createdOrder = mockOrder({
        durationDays: 365,
        benefitStart: new Date(startDate),
        benefitEnd: new Date('2027-01-01T00:00:00.000Z'),
      });
      repository.create.mockResolvedValue(createdOrder);

      const result = await service.create({
        amount: 36500,
        productId: 'prod-1',
        benefitStart: startDate,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          durationDays: 365,
          benefitStart: new Date(startDate),
          benefitEnd: new Date('2027-01-01T00:00:00.000Z'),
        }),
      );
      expect(result.durationDays).toBe(365);
    });

    it('respects explicitly provided durationDays over product durationDays', async () => {
      repository.findByOrderCode.mockResolvedValue(null);
      repository.findByOrderNumber.mockResolvedValue(null);
      repository.productExists.mockResolvedValue(true);
      repository.findProductById.mockResolvedValue({
        id: 'prod-1',
        name: '年度会员',
        durationDays: 365,
      });

      const startDate = '2026-01-01T00:00:00.000Z';
      const createdOrder = mockOrder({
        durationDays: 30,
        benefitStart: new Date(startDate),
        benefitEnd: new Date('2026-01-31T00:00:00.000Z'),
      });
      repository.create.mockResolvedValue(createdOrder);

      const result = await service.create({
        amount: 3000,
        productId: 'prod-1',
        durationDays: 30,
        benefitStart: startDate,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          durationDays: 30,
          benefitStart: new Date(startDate),
          benefitEnd: new Date('2026-01-31T00:00:00.000Z'),
        }),
      );
      expect(result.durationDays).toBe(30);
    });
  });
});
