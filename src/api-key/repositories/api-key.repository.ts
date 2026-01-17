import { Injectable } from '@nestjs/common';
import { ApiKey, ApiKeyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * API Key Repository
 * 负责所有 API Key 相关的数据库操作，确保多租户隔离
 */
@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建 API Key
   * @param data 创建数据
   * @returns 创建的 API Key
   */
  async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
    return this.prisma.apiKey.create({
      data,
    });
  }

  /**
   * 根据 prefix 查找 API Key（用于认证）
   * @param prefix Key 前缀
   * @returns API Key 或 null
   */
  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { prefix },
    });
  }

  /**
   * 根据 ID 和组织 ID 查找 API Key（多租户隔离）
   * @param id API Key ID
   * @param orgId 组织 ID
   * @returns API Key 或 null
   */
  async findById(id: string, orgId: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: {
        id,
        orgId,
      },
    });
  }

  /**
   * 查询组织的 API Keys（支持分页）
   * @param orgId 组织 ID
   * @param options 查询选项
   * @returns API Keys 数组和总数
   */
  async findMany(
    orgId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ApiKeyOrderByWithRelationInput;
      createdBy?: string;
    },
  ): Promise<{ items: ApiKey[]; total: number }> {
    const where: Prisma.ApiKeyWhereInput = {
      orgId,
    };

    if (options?.createdBy) {
      where.createdBy = options.createdBy;
    }

    const [items, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: options?.orderBy || { createdAt: 'desc' },
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 更新 API Key（多租户隔离）
   * @param id API Key ID
   * @param orgId 组织 ID
   * @param data 更新数据
   * @returns 更新后的 API Key
   */
  async update(
    id: string,
    orgId: string,
    data: Prisma.ApiKeyUpdateInput,
  ): Promise<ApiKey> {
    // 先验证 key 属于该组织
    await this.findById(id, orgId);

    return this.prisma.apiKey.update({
      where: { id },
      data,
    });
  }

  /**
   * 撤销 API Key（软删除，设置状态为 REVOKED）
   * @param id API Key ID
   * @param orgId 组织 ID
   * @returns 更新后的 API Key
   */
  async revoke(id: string, orgId: string): Promise<ApiKey> {
    return this.update(id, orgId, {
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date(),
    });
  }

  /**
   * 更新最后使用时间（异步，不阻塞请求）
   * @param id API Key ID
   */
  updateLastUsedAt(id: string): void {
    // 使用 fire-and-forget 模式，不等待结果
    void this.prisma.apiKey
      .update({
        where: { id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        // 静默失败，记录错误但不影响主流程
        console.error('Failed to update lastUsedAt:', error);
      });
  }

  /**
   * 删除 API Key（物理删除，谨慎使用）
   * @param id API Key ID
   * @param organizationId 组织 ID
   */
  async delete(id: string, organizationId: string): Promise<void> {
    // 先验证 key 属于该组织
    await this.findById(id, organizationId);

    await this.prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * 批量查询过期的 API Keys（用于清理任务）
   * @param limit 限制数量
   * @returns 过期的 API Keys
   */
  async findExpiredKeys(limit: number = 100): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: {
        status: ApiKeyStatus.ACTIVE,
        expiresAt: {
          lt: new Date(),
        },
      },
      take: limit,
    });
  }

  /**
   * 批量更新过期 Keys 的状态
   * @param ids API Key IDs
   */
  async markAsExpired(ids: string[]): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: ApiKeyStatus.EXPIRED,
      },
    });
  }
}
