import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VerificationCodeType } from '@prisma/client';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createVerificationCode(data: {
    target: string;
    code: string;
    type: VerificationCodeType;
    expiresAt: Date;
    ip: string;
    userAgent?: string;
  }): Promise<{ id: string }> {
    const record = await this.prisma.verificationCode.create({
      data,
      select: { id: true },
    });
    return record;
  }

  async findValidVerificationCode(
    target: string,
    code: string,
    type: VerificationCodeType,
  ) {
    return this.prisma.verificationCode.findFirst({
      where: {
        target,
        code,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await this.prisma.verificationCode.update({
      where: { id },
      data: { used: true },
    });
  }

  /**
   * 原子性地验证并标记验证码为已使用
   * 使用数据库事务确保验证和标记为已使用是原子操作，防止重放攻击
   */
  async verifyAndMarkCodeUsed(
    target: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<{ id: string; used: boolean } | null> {
    return this.prisma.$transaction(async (tx) => {
      // 1. 查找有效的验证码（未使用且未过期）
      const verificationCode = await tx.verificationCode.findFirst({
        where: {
          target,
          code,
          type,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!verificationCode) {
        return null;
      }

      // 2. 立即标记为已使用（在同一事务中）
      await tx.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      });

      return { id: verificationCode.id, used: true };
    });
  }

  async deleteExpiredVerificationCodes(before: Date): Promise<number> {
    const result = await this.prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }

  async countSentToTargetSince(target: string, since: Date): Promise<number> {
    return this.prisma.verificationCode.count({
      where: {
        target,
        createdAt: { gte: since },
      },
    });
  }

  async countSentFromIpSince(ip: string, since: Date): Promise<number> {
    return this.prisma.verificationCode.count({
      where: {
        ip,
        createdAt: { gte: since },
      },
    });
  }

  async upsertSendLimit(target: string, ip: string, at: Date): Promise<void> {
    await this.prisma.codeSendLimit.upsert({
      where: {
        target_ip: { target, ip },
      },
      update: {
        sendCount: { increment: 1 },
        lastSentAt: at,
      },
      create: {
        target,
        ip,
        sendCount: 1,
        lastSentAt: at,
      },
    });
  }
}
