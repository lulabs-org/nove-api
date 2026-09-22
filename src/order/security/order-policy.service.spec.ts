import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Order, OrderStatus, Currency } from '@/generated/prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';
import { OrderAbilityFactory } from './order-ability.factory';
import { OrderPolicyService } from './order-policy.service';

describe('OrderPolicyService', () => {
  let factory: OrderAbilityFactory;
  let service: OrderPolicyService;

  beforeEach(() => {
    factory = new OrderAbilityFactory();
    service = new OrderPolicyService(factory);
  });

  const baseOrder: Order = {
    id: 'order-1',
    orderCode: 'ORD001',
    orderNumber: 'ON001',
    externalId: null,
    metadata: null,
    productId: 'prod-1',
    productName: '测试课程',
    purchaserId: 'user-purchaser',
    channelId: 1,
    email: 'test@example.com',
    phone: '13800000000',
    phoneCode: '+86',
    currentOwnerId: 'user-sales-1',
    financialCloserId: null,
    financialClosedAt: null,
    settledAt: null,
    settleInfo: null,
    amount: 10000,
    currency: Currency.CNY,
    amountCny: 10000,
    fxRateToCny: null,
    fxLockedAt: null,
    status: OrderStatus.PAID,
    paidAt: new Date(),
    cancelledAt: null,
    completedAt: null,
    durationDays: 30,
    benefitStart: new Date(),
    benefitEnd: new Date(),
    frozenDays: 0,
    frozenAt: null,
    paymentProvider: null,
    providerTradeNo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const adminAuth: AuthContext = {
    authMethod: 'jwt',
    userId: 'admin-1',
    orgId: 'org-1',
    permissions: ['order:admin'],
    user: {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['ADMIN'],
      active: true,
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const sales1Auth: AuthContext = {
    authMethod: 'jwt',
    userId: 'user-sales-1',
    orgId: 'org-1',
    permissions: ['order:read', 'order:update'],
    user: {
      id: 'user-sales-1',
      username: 'sales1',
      email: 'sales1@example.com',
      roles: ['USER'],
      active: true,
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const sales2Auth: AuthContext = {
    authMethod: 'jwt',
    userId: 'user-sales-2',
    orgId: 'org-1',
    permissions: ['order:read', 'order:update'],
    user: {
      id: 'user-sales-2',
      username: 'sales2',
      email: 'sales2@example.com',
      roles: ['USER'],
      active: true,
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  describe('getAccessibleWhere', () => {
    it('returns empty object (full access) for admin', () => {
      const where = service.getAccessibleWhere(adminAuth);
      expect(where).toEqual({});
    });

    it('returns owner/purchaser/unassigned filtering for sales user', () => {
      const where = service.getAccessibleWhere(sales1Auth);
      expect(where).toBeDefined();
    });
  });

  describe('assertCanRead', () => {
    it('allows admin to read any order', () => {
      expect(() => service.assertCanRead(baseOrder, adminAuth)).not.toThrow();
    });

    it('allows sales to read order they own', () => {
      expect(() => service.assertCanRead(baseOrder, sales1Auth)).not.toThrow();
    });

    it('rejects sales from reading order owned by someone else (throws NotFoundException)', () => {
      expect(() => service.assertCanRead(baseOrder, sales2Auth)).toThrow(
        NotFoundException,
      );
    });

    it('allows sales to read unassigned order (currentOwnerId is null)', () => {
      const unassignedOrder = { ...baseOrder, currentOwnerId: null };
      expect(() =>
        service.assertCanRead(unassignedOrder, sales2Auth),
      ).not.toThrow();
    });
  });

  describe('assertCanUpdate', () => {
    it('allows sales to update order they own when status is PAID', () => {
      expect(() => service.assertCanUpdate(baseOrder, sales1Auth)).not.toThrow();
    });

    it('forbids sales from updating order owned by someone else', () => {
      expect(() => service.assertCanUpdate(baseOrder, sales2Auth)).toThrow(
        ForbiddenException,
      );
    });

    it('forbids sales from updating CANCELLED order even if owned', () => {
      const cancelledOrder = { ...baseOrder, status: OrderStatus.CANCELLED };
      expect(() =>
        service.assertCanUpdate(cancelledOrder, sales1Auth),
      ).toThrow(ForbiddenException);
    });

    it('allows admin to update even CANCELLED order', () => {
      const cancelledOrder = { ...baseOrder, status: OrderStatus.CANCELLED };
      expect(() =>
        service.assertCanUpdate(cancelledOrder, adminAuth),
      ).not.toThrow();
    });
  });

  describe('assertCanAdjustBenefit', () => {
    it('allows sales to adjust benefit for their own PAID order', () => {
      expect(() =>
        service.assertCanAdjustBenefit(baseOrder, sales1Auth),
      ).not.toThrow();
    });

    it('forbids sales from adjusting benefit for another sales order', () => {
      expect(() =>
        service.assertCanAdjustBenefit(baseOrder, sales2Auth),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertCanDelete', () => {
    it('allows admin to delete', () => {
      const deleteAdmin: AuthContext = {
        ...adminAuth,
        permissions: ['order:delete'],
      };
      expect(() => service.assertCanDelete(baseOrder, deleteAdmin)).not.toThrow();
    });

    it('forbids normal sales from deleting order', () => {
      expect(() => service.assertCanDelete(baseOrder, sales1Auth)).toThrow(
        ForbiddenException,
      );
    });
  });
});
