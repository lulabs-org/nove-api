/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { LinkOrdersToUsersByPhoneHandler } from './link-orders-to-users-by-phone.handler';
import { TaskHandlerRegistry } from './task-handler.registry';

describe('LinkOrdersToUsersByPhoneHandler', () => {
  let handler: LinkOrdersToUsersByPhoneHandler;
  let prisma: {
    order: { findMany: jest.Mock; updateMany: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock };
  };
  let registry: jest.Mocked<TaskHandlerRegistry>;

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    registry = {
      register: jest.fn(),
    } as unknown as jest.Mocked<TaskHandlerRegistry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkOrdersToUsersByPhoneHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: TaskHandlerRegistry, useValue: registry },
      ],
    }).compile();

    handler = module.get(LinkOrdersToUsersByPhoneHandler);
  });

  it('registers itself on module init', () => {
    handler.onModuleInit();

    expect(registry.register).toHaveBeenCalledWith(handler);
    expect(handler.name).toBe('link_orders_to_users_by_phone');
  });

  it('matches normalized contacts and creates a user only when necessary', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        { id: 'order-1', phoneCode: '86', phone: '138 0013 8000' },
        { id: 'order-2', phoneCode: '+86', phone: '13900139000' },
        { id: 'order-3', phoneCode: null, phone: '13700137000' },
      ])
      .mockResolvedValueOnce([]);
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', deletedAt: null })
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({ id: 'user-2' });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await handler.handle({ id: 'job-1', data: {} } as Job);

    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        uq_users_country_code_phone: {
          countryCode: '+86',
          phone: '13800138000',
        },
      },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        countryCode: '+86',
        phone: '13900139000',
        phoneVerifiedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        username: expect.any(String),
      },
      select: { id: true },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      candidates: 3,
      linked: 2,
      usersCreated: 1,
      invalidContacts: 1,
      deletedUserConflicts: 0,
      skipped: 0,
      batches: 1,
    });
  });

  it('reuses a user for duplicate contacts and does not overwrite a concurrent link', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        { id: 'order-1', phoneCode: '+86', phone: '13800138000' },
        { id: 'order-2', phoneCode: '+86', phone: '13800138000' },
      ])
      .mockResolvedValueOnce([]);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
    prisma.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await handler.handle({ data: { batchSize: 100 } } as Job);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ linked: 1, skipped: 1, usersCreated: 0 });
  });

  it('skips contacts owned by soft-deleted users', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce([
        { id: 'order-1', phoneCode: '+86', phone: '13800138000' },
      ])
      .mockResolvedValueOnce([]);
    prisma.user.findUnique.mockResolvedValue({
      id: 'deleted-user',
      deletedAt: new Date(),
    });

    const result = await handler.handle({ data: {} } as Job);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ deletedUserConflicts: 1, linked: 0 });
  });

  it('rejects an invalid batch size', async () => {
    await expect(
      handler.handle({ data: { batchSize: 0 } } as Job),
    ).rejects.toThrow('batchSize must be an integer between 1 and 2000');
  });
});
