import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { createHash } from 'node:crypto';
import {
  RefreshToken,
  CreateRefreshTokenData,
  RevokeRefreshTokenOptions,
} from '../types';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建哈希值
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * 存储刷新令牌
   */
  async createRefreshToken(
    data: CreateRefreshTokenData,
  ): Promise<RefreshToken> {
    const tokenHash = this.hashToken(data.token);

    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash,
        jti: data.jti,
        expiresAt: data.expiresAt,
        deviceInfo: data.deviceInfo,
        deviceId: data.deviceId,
        userAgent: data.userAgent,
        ip: data.ip,
      },
    }) as Promise<RefreshToken>;
  }

  /**
   * 通过令牌查找刷新令牌记录
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    }) as Promise<RefreshToken | null>;
  }

  /**
   * 通过JTI查找刷新令牌记录
   */
  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { jti },
    }) as Promise<RefreshToken | null>;
  }

  /**
   * 撤销刷新令牌
   */
  async revokeToken(
    token: string,
    options: RevokeRefreshTokenOptions = {},
  ): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);
    const revokedAt = options.revokedAt || new Date();

    try {
      return (await this.prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt,
          replacedBy: options.replacedBy,
        },
      })) as RefreshToken;
    } catch {
      // 令牌不存在或已撤销
      return null;
    }
  }

  /**
   * 通过JTI撤销刷新令牌
   */
  async revokeTokenByJti(
    jti: string,
    options: RevokeRefreshTokenOptions = {},
  ): Promise<RefreshToken | null> {
    const revokedAt = options.revokedAt || new Date();

    try {
      return (await this.prisma.refreshToken.update({
        where: { jti },
        data: {
          revokedAt,
          replacedBy: options.replacedBy,
        },
      })) as RefreshToken;
    } catch {
      // 令牌不存在或已撤销
      return null;
    }
  }

  /**
   * 原子操作：检查并撤销刷新令牌
   * 使用 updateMany + where 条件实现乐观锁，防止竞态条件
   * 只有当令牌未被撤销时才会更新成功
   */
  async atomicRevokeIfNotRevoked(
    jti: string,
    options: RevokeRefreshTokenOptions = {},
  ): Promise<{ success: boolean; token?: RefreshToken }> {
    const revokedAt = options.revokedAt || new Date();

    // 使用 updateMany 实现原子操作：只有在 revokedAt 为 null 时才更新
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        jti,
        revokedAt: null, // 只更新未撤销的令牌
      },
      data: {
        revokedAt,
        replacedBy: options.replacedBy,
      },
    });

    if (result.count === 0) {
      // 没有更新任何记录，说明令牌已被撤销或不存在
      return { success: false };
    }

    // 更新成功后，获取完整的令牌记录
    const token = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    return { success: true, token: token as RefreshToken };
  }

  /**
   * 撤销用户的所有刷新令牌
   */
  async revokeAllTokensByUserId(
    userId: string,
    excludeJti?: string,
    options: RevokeRefreshTokenOptions = {},
  ): Promise<number> {
    const revokedAt = options.revokedAt || new Date();

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(excludeJti && { jti: { not: excludeJti } }),
      },
      data: {
        revokedAt,
        replacedBy: options.replacedBy,
      },
    });

    return result.count;
  }

  /**
   * 检查JTI是否有效
   */
  async isJtiValid(jti: string): Promise<boolean> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    if (!refreshToken) {
      return false;
    }

    return (
      refreshToken.revokedAt === null && refreshToken.expiresAt > new Date()
    );
  }

  /**
   * 撤销设备的所有刷新令牌
   */
  async revokeTokensByDeviceId(
    userId: string,
    deviceId: string,
    options: RevokeRefreshTokenOptions = {},
  ): Promise<number> {
    const revokedAt = options.revokedAt || new Date();

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        deviceId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        replacedBy: options.replacedBy,
      },
    });

    return result.count;
  }
}
