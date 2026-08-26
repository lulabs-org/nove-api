/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Platform } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { LinkPlatformUsersByPhoneHashHandler } from './link-platform-users-by-phone-hash.handler';
import { TaskHandlerRegistry } from './task-handler.registry';
import { UserPhoneHashRepository } from '@/user/repositories/user-phone-hash.repository';

describe('LinkPlatformUsersByPhoneHashHandler', () => {
  let handler: LinkPlatformUsersByPhoneHashHandler;
  let prisma: {
    platformUser: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let userPhoneHashRepo: { findMany: jest.Mock };
  let registry: jest.Mocked<TaskHandlerRegistry>;

  beforeEach(async () => {
    prisma = {
      platformUser: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    userPhoneHashRepo = {
      findMany: jest.fn(),
    };
    registry = {
      register: jest.fn(),
    } as unknown as jest.Mocked<TaskHandlerRegistry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkPlatformUsersByPhoneHashHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: UserPhoneHashRepository, useValue: userPhoneHashRepo },
        { provide: TaskHandlerRegistry, useValue: registry },
      ],
    }).compile();

    handler = module.get(LinkPlatformUsersByPhoneHashHandler);
  });

  it('registers itself on module init', () => {
    handler.onModuleInit();

    expect(registry.register).toHaveBeenCalledWith(handler);
    expect(handler.name).toBe('link_platform_users_by_phone_hash');
  });

  it('links only hashes from the same platform and reports unmatched users', async () => {
    prisma.platformUser.findMany
      .mockResolvedValueOnce([
        {
          id: 'platform-user-1',
          platform: Platform.TENCENT_MEETING,
          phoneHash: 'shared-hash',
        },
        {
          id: 'platform-user-2',
          platform: Platform.ZOOM,
          phoneHash: 'shared-hash',
        },
      ])
      .mockResolvedValueOnce([]);
    userPhoneHashRepo.findMany.mockResolvedValue([
      {
        platform: Platform.TENCENT_MEETING,
        hashValue: 'shared-hash',
        userId: 'user-1',
      },
    ]);
    prisma.platformUser.updateMany.mockResolvedValue({ count: 1 });

    const result = await handler.handle({ id: 'job-1', data: {} } as Job);

    expect(prisma.platformUser.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.platformUser.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'platform-user-1',
        localUserId: null,
        deletedAt: null,
      },
      data: { localUserId: 'user-1' },
    });
    expect(result).toEqual({
      success: true,
      platform: 'ALL',
      candidates: 2,
      linked: 1,
      unmatched: 1,
      skipped: 0,
      batches: 1,
    });
  });

  it('supports platform filtering and does not overwrite a concurrent link', async () => {
    prisma.platformUser.findMany
      .mockResolvedValueOnce([
        {
          id: 'platform-user-1',
          platform: Platform.FEISHU,
          phoneHash: 'hash-1',
        },
      ])
      .mockResolvedValueOnce([]);
    userPhoneHashRepo.findMany.mockResolvedValue([
      {
        platform: Platform.FEISHU,
        hashValue: 'hash-1',
        userId: 'user-1',
      },
    ]);
    prisma.platformUser.updateMany.mockResolvedValue({ count: 0 });

    const result = await handler.handle({
      id: 'job-2',
      data: { platform: Platform.FEISHU, batchSize: 100 },
    } as Job);

    expect(prisma.platformUser.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        localUserId: null,
        phoneHash: { not: null },
        deletedAt: null,
        platform: Platform.FEISHU,
      },
      select: { id: true, platform: true, phoneHash: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
    expect(result).toMatchObject({ linked: 0, unmatched: 0, skipped: 1 });
  });

  it('rejects invalid task payload', async () => {
    await expect(
      handler.handle({ data: { platform: 'UNKNOWN' } } as Job),
    ).rejects.toThrow('Invalid platform: UNKNOWN');
    await expect(
      handler.handle({ data: { batchSize: 0 } } as Job),
    ).rejects.toThrow('batchSize must be an integer between 1 and 2000');
  });
});
