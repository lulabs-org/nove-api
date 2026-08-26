/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Currency, RefundChannel, RefundStatus } from '@prisma/client';
import {
  OrderRefundRepository,
  OrderRefundWithRelations,
} from './order-refund.repository';
import { OrderRefundService } from './order-refund.service';

const now = new Date('2026-08-13T00:00:00.000Z');
const refund = (
  overrides: Partial<OrderRefundWithRelations> = {},
): OrderRefundWithRelations => ({
  id: 'refund-1',
  afterSaleCode: 'AS-001',
  orderId: 'order-1',
  refundChannel: RefundChannel.WECHAT,
  approvalUrl: null,
  createdBy: 'user-1',
  refundAmount: 9900,
  refundReason: '重复购买',
  benefitUsedDays: 0,
  applicantName: '张三',
  status: RefundStatus.PENDING,
  financialNote: null,
  parentId: null,
  productCategory: '课程',
  submittedAt: now,
  refundedAt: null,
  financialSettledAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  order: {
    id: 'order-1',
    orderCode: 'ORD001',
    orderNumber: 'NO001',
    productName: '课程',
    amount: 9900,
    currency: Currency.CNY,
    email: 'customer@example.com',
    phone: '13800138000',
  },
  creator: {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    profile: { displayName: '管理员' },
  },
  ...overrides,
});

describe('OrderRefundService', () => {
  let repository: jest.Mocked<OrderRefundRepository>;
  let service: OrderRefundService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAfterSaleCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      orderExists: jest.fn(),
      refundExists: jest.fn(),
    } as unknown as jest.Mocked<OrderRefundRepository>;
    service = new OrderRefundService(repository);
  });

  it('registers a normalized pending refund with actor and submission time', async () => {
    repository.findByAfterSaleCode.mockResolvedValue(null);
    repository.orderExists.mockResolvedValue(true);
    repository.create.mockResolvedValue(refund());

    const result = await service.create(
      {
        afterSaleCode: ' AS-001 ',
        orderId: 'order-1',
        refundAmount: 9900,
        refundReason: ' 重复购买 ',
      },
      'user-1',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        afterSaleCode: 'AS-001',
        refundReason: '重复购买',
        submittedAt: expect.any(Date),
        order: { connect: { id: 'order-1' } },
        creator: { connect: { id: 'user-1' } },
      }),
    );
    expect(result.creator?.displayName).toBe('管理员');
  });

  it('rejects duplicate codes and missing relations', async () => {
    repository.findByAfterSaleCode.mockResolvedValue(refund());
    await expect(
      service.create({ afterSaleCode: 'AS-001' }),
    ).rejects.toBeInstanceOf(ConflictException);

    repository.findByAfterSaleCode.mockResolvedValue(null);
    repository.orderExists.mockResolvedValue(false);
    await expect(
      service.create({ afterSaleCode: 'AS-002', orderId: 'missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds keyword, status and submission filters with stable sorting', async () => {
    repository.findMany.mockResolvedValue({ items: [refund()], total: 1 });

    const result = await service.findAll({
      page: 2,
      pageSize: 20,
      keyword: 'AS',
      status: RefundStatus.PENDING,
      refundChannel: RefundChannel.WECHAT,
      submittedFrom: '2026-08-01T00:00:00.000Z',
      sortField: 'refundAmount',
      sortOrder: 'ascend',
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          deletedAt: null,
          status: RefundStatus.PENDING,
          refundChannel: RefundChannel.WECHAT,
          OR: expect.any(Array),
        }),
        orderBy: [{ refundAmount: 'asc' }, { createdAt: 'desc' }],
      }),
    );
    expect(result).toMatchObject({ page: 2, pageSize: 20, total: 1 });
  });

  it('settles a refund and records both timestamps', async () => {
    repository.findById.mockResolvedValue(refund());
    repository.update.mockImplementation((_id, data) =>
      Promise.resolve(
        refund({
          status: data.status as RefundStatus,
          refundedAt: data.refundedAt as Date,
          financialSettledAt: data.financialSettledAt as Date,
        }),
      ),
    );

    const result = await service.updateStatus('refund-1', {});

    expect(repository.update).toHaveBeenCalledWith(
      'refund-1',
      expect.objectContaining({
        status: RefundStatus.SETTLED,
        refundedAt: expect.any(Date),
        financialSettledAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(RefundStatus.SETTLED);
  });

  it('clears settlement timestamps when reopening a refund', async () => {
    repository.findById.mockResolvedValue(
      refund({ status: RefundStatus.SETTLED }),
    );
    repository.update.mockResolvedValue(refund());

    await service.updateStatus('refund-1', { status: RefundStatus.PENDING });

    expect(repository.update).toHaveBeenCalledWith(
      'refund-1',
      expect.objectContaining({
        status: RefundStatus.PENDING,
        refundedAt: null,
        financialSettledAt: null,
      }),
    );
  });

  it('does not operate on deleted or missing refunds', async () => {
    repository.findById.mockResolvedValue(refund({ deletedAt: now }));
    await expect(service.findById('refund-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
