import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VerificationCodeType } from '@prisma/client';

@Injectable()
export class VerificationCodeRepository {
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

  async invalidateActiveCodes(
    target: string,
    type: VerificationCodeType,
    exceptId?: string,
  ): Promise<void> {
    await this.prisma.verificationCode.updateMany({
      where: {
        target,
        type,
        used: false,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { used: true },
    });
  }

  async deleteVerificationCode(id: string): Promise<void> {
    await this.prisma.verificationCode.delete({ where: { id } });
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

  async findLatestActiveCode(target: string, type: VerificationCodeType) {
    return this.prisma.verificationCode.findFirst({
      where: {
        target,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttemptCount(id: string): Promise<number> {
    const record = await this.prisma.verificationCode.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
      select: { attemptCount: true },
    });
    if (record.attemptCount >= 5) {
      await this.markVerificationCodeUsed(id);
    }
    return record.attemptCount;
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await this.prisma.verificationCode.update({
      where: { id },
      data: { used: true },
    });
  }

  async deleteExpiredVerificationCodes(before: Date): Promise<number> {
    const result = await this.prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }

  async countSentToTargetSince(target: string, since: Date): Promise<number> {
    const result = await this.prisma.codeSendLimit.aggregate({
      where: {
        target,
        lastSentAt: { gte: since },
      },
      _sum: { sendCount: true },
    });
    return result._sum.sendCount ?? 0;
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
    const existing = await this.prisma.codeSendLimit.findUnique({
      where: { target_ip: { target, ip } },
      select: { lastSentAt: true },
    });
    const oneHourAgo = new Date(at.getTime() - 60 * 60 * 1000);
    const shouldReset = !existing || existing.lastSentAt < oneHourAgo;

    await this.prisma.codeSendLimit.upsert({
      where: {
        target_ip: { target, ip },
      },
      update: {
        sendCount: shouldReset ? 1 : { increment: 1 },
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
