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
        jti: data.jti || null,
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

  async deleteToken(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    try {
      await this.prisma.refreshToken.delete({
        where: { tokenHash },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteAllTokensByUserId(
    userId: string,
    excludeTokenHash?: string,
  ): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        ...(excludeTokenHash && { tokenHash: { not: excludeTokenHash } }),
      },
    });

    return result.count;
  }

  async deleteTokensByDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        deviceId,
      },
    });

    return result.count;
  }
}
