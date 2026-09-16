import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { Response } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

describe('AppController', () => {
  let appController: AppController;
  let prismaService: { $queryRaw: jest.Mock };
  let redisClient: { ping: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    redisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const redisService = {
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 120,
          },
        ]),
      ],
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  const createMockResponse = () => {
    const mockStatus = jest.fn().mockReturnThis();
    const res = {
      status: mockStatus,
    } as unknown as Response;
    return { res, mockStatus };
  };

  describe('health', () => {
    it('should return status "ok" and timestamp without sensitive data when healthy', async () => {
      const { res, mockStatus } = createMockResponse();
      const result = await appController.health(res);

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');

      // 确保脱敏：绝不泄露内部组件细节、内存占用或版本信息
      expect(result).not.toHaveProperty('components');
      expect(result).not.toHaveProperty('memory');
      expect(result).not.toHaveProperty('version');
      expect(result).not.toHaveProperty('environment');
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 503 and status "error" when database fails', async () => {
      prismaService.$queryRaw.mockRejectedValueOnce(
        new Error('Database connection timeout'),
      );

      const { res, mockStatus } = createMockResponse();
      const result = await appController.health(res);

      expect(result.status).toBe('error');
      expect(typeof result.timestamp).toBe('string');
      expect(result).not.toHaveProperty('components');
      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return 503 and status "error" when redis fails', async () => {
      redisClient.ping.mockRejectedValueOnce(
        new Error('Redis connection refused'),
      );

      const { res, mockStatus } = createMockResponse();
      const result = await appController.health(res);

      expect(result.status).toBe('error');
      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should reuse cached probe result within cache TTL without querying database again', async () => {
      const { res: res1 } = createMockResponse();
      const firstResult = await appController.health(res1);
      expect(firstResult.status).toBe('ok');
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);

      // 立即发起的第二次探测应命中 3 秒内存短缓存
      const { res: res2 } = createMockResponse();
      const secondResult = await appController.health(res2);
      expect(secondResult.status).toBe('ok');
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1); // 确认没有发生二次查库
    });
  });
});
