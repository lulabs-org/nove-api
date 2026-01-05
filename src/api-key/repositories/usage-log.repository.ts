import { Injectable } from '@nestjs/common';
import { ApiKeyUsageLog, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * API Key Usage Log Repository
 * 负责使用日志的数据库操作
 */
@Injectable()
export class UsageLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建使用日志
   * @param data 日志数据
   * @returns 创建的日志记录
   */
  async create(
    data: Prisma.ApiKeyUsageLogCreateInput,
  ): Promise<ApiKeyUsageLog> {
    return this.prisma.apiKeyUsageLog.create({
      data,
    });
  }

  /**
   * 批量创建使用日志（用于高并发场景）
   * @param data 日志数据数组
   * @returns 创建的记录数
   */
  async createMany(
    data: Prisma.ApiKeyUsageLogCreateManyInput[],
  ): Promise<number> {
    const result = await this.prisma.apiKeyUsageLog.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * 查询 API Key 的使用日志
   * @param apiKeyId API Key ID
   * @param options 查询选项
   * @returns 日志列表和总数
   */
  async findByApiKey(
    apiKeyId: string,
    options?: {
      skip?: number;
      take?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ items: ApiKeyUsageLog[]; total: number }> {
    const where: Prisma.ApiKeyUsageLogWhereInput = {
      apiKeyId,
      ...(options?.startDate || options?.endDate
        ? {
            createdAt: {
              ...(options.startDate && { gte: options.startDate }),
              ...(options.endDate && { lte: options.endDate }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.apiKeyUsageLog.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiKeyUsageLog.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 查询组织的使用日志
   * @param organizationId 组织 ID
   * @param options 查询选项
   * @returns 日志列表和总数
   */
  async findByOrganization(
    organizationId: string,
    options?: {
      skip?: number;
      take?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ items: ApiKeyUsageLog[]; total: number }> {
    const where: Prisma.ApiKeyUsageLogWhereInput = {
      organizationId,
      ...(options?.startDate || options?.endDate
        ? {
            createdAt: {
              ...(options.startDate && { gte: options.startDate }),
              ...(options.endDate && { lte: options.endDate }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.apiKeyUsageLog.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiKeyUsageLog.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 删除旧日志（用于数据清理）
   * @param beforeDate 删除此日期之前的日志
   * @returns 删除的记录数
   */
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const result = await this.prisma.apiKeyUsageLog.deleteMany({
      where: {
        createdAt: {
          lt: beforeDate,
        },
      },
    });
    return result.count;
  }
}
