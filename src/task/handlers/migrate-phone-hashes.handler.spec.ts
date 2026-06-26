/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import { Platform } from '@prisma/client';
import { MigratePhoneHashesHandler } from './migrate-phone-hashes.handler';
import { TaskHandlerRegistry } from './task-handler.registry';
import { PrismaService } from '../../prisma/prisma.service';

describe('MigratePhoneHashesHandler', () => {
  let handler: MigratePhoneHashesHandler;
  let prisma: PrismaService & {
    user: {
      findMany: jest.Mock;
    };
    userPhoneHash: {
      upsert: jest.Mock;
    };
  };
  let registry: jest.Mocked<TaskHandlerRegistry>;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      TENCENT_MEETING_SECRET_ID: 'mock-secret-id',
    };

    const mockPrisma = {
      user: {
        findMany: jest.fn(),
      },
      userPhoneHash: {
        upsert: jest.fn(),
      },
    };

    const mockRegistry = {
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigratePhoneHashesHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TaskHandlerRegistry, useValue: mockRegistry },
      ],
    }).compile();

    handler = module.get<MigratePhoneHashesHandler>(MigratePhoneHashesHandler);
    prisma = module.get(PrismaService);
    registry = module.get(TaskHandlerRegistry);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should register itself on module init', () => {
    handler.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(handler);
    expect(handler.name).toBe('migrate_phone_hashes');
  });

  describe('handle', () => {
    it('should migrate users with phone numbers successfully', async () => {
      const mockUsers = [
        { id: 'user-1', phone: '13800000000' },
        { id: 'user-2', phone: '13900000000' },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.userPhoneHash.upsert.mockResolvedValue({} as any);

      const job = {} as Job;
      const result = await handler.handle(job);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      });

      const hash1 = crypto
        .createHash('sha256')
        .update('13800000000/mock-secret-id')
        .digest('hex');
      const hash2 = crypto
        .createHash('sha256')
        .update('13900000000/mock-secret-id')
        .digest('hex');

      expect(prisma.userPhoneHash.upsert).toHaveBeenNthCalledWith(1, {
        where: {
          userId_platform: {
            userId: 'user-1',
            platform: Platform.TENCENT_MEETING,
          },
        },
        create: {
          userId: 'user-1',
          hashValue: hash1,
          platform: Platform.TENCENT_MEETING,
        },
        update: {
          hashValue: hash1,
        },
      });

      expect(prisma.userPhoneHash.upsert).toHaveBeenNthCalledWith(2, {
        where: {
          userId_platform: {
            userId: 'user-2',
            platform: Platform.TENCENT_MEETING,
          },
        },
        create: {
          userId: 'user-2',
          hashValue: hash2,
          platform: Platform.TENCENT_MEETING,
        },
        update: {
          hashValue: hash2,
        },
      });

      expect(result).toEqual({
        success: true,
        migrated: 2,
        errors: 0,
      });
    });

    it('should skip users with no phone', async () => {
      const mockUsers = [
        { id: 'user-1', phone: null },
        { id: 'user-2', phone: '' },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const job = {} as Job;
      const result = await handler.handle(job);

      expect(prisma.userPhoneHash.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        migrated: 0,
        errors: 0,
      });
    });

    it('should handle and count errors when upsert fails', async () => {
      const mockUsers = [
        { id: 'user-1', phone: '13800000000' },
        { id: 'user-2', phone: '13900000000' },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.userPhoneHash.upsert
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({} as any);

      const job = {} as Job;
      const result = await handler.handle(job);

      expect(result).toEqual({
        success: true,
        migrated: 1,
        errors: 1,
      });
    });
  });
});
