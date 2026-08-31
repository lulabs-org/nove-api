import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SecurityNotificationChannel,
  SecurityNotificationRecipient,
  UserSecurityAuditEventType,
  VerificationCodeType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { OtpService } from '@/auth/services/otp.service';
import { CodeType } from '@/common/enums';
import { hashPassword, validatePassword } from '@/common/utils/password.util';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import {
  AccountSecurityResponseDto,
  ChangeEmailDto,
  ChangePasswordDto,
  ChangePhoneDto,
  LoginActivitiesQueryDto,
  LoginActivitiesResponseDto,
  SecurityCodeChannel,
  SecuritySessionDto,
  SecurityVerificationMethod,
} from '@/auth/dto/account-security.dto';
import { SecurityAuditCryptoService } from './security-audit-crypto.service';

const MAX_CODE_ATTEMPTS = 5;

interface ContactChangeContext {
  ip: string;
  userAgent?: string;
  currentRefreshToken?: string;
}

@Injectable()
export class AccountSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly auditCrypto: SecurityAuditCryptoService,
  ) {}

  async getSecurity(userId: string): Promise<AccountSecurityResponseDto> {
    const user = await this.requireUser(userId);
    return this.toSecurityResponse(user);
  }

  async verifyIdentity(
    userId: string,
    proof: {
      verificationMethod: SecurityVerificationMethod;
      currentPassword?: string;
      identityCode?: string;
    },
  ): Promise<{ verified: true }> {
    const user = await this.requireUser(userId);
    await this.verifyProof(user, proof);
    return { verified: true };
  }

  async sendIdentityCode(
    userId: string,
    channel: SecurityCodeChannel,
    ip: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string; maskedTarget: string }> {
    const user = await this.requireUser(userId);
    if (channel === SecurityCodeChannel.EMAIL) {
      if (!user.email || !user.emailVerifiedAt) {
        throw new BadRequestException('当前账号没有已验证邮箱');
      }
      const result = await this.otpService.sendSecurityCode(
        user.email,
        CodeType.IDENTITY_CONFIRM,
        ip,
        userAgent,
      );
      return { ...result, maskedTarget: this.maskEmail(user.email) };
    }

    if (!user.phone || !user.phoneVerifiedAt) {
      throw new BadRequestException('当前账号没有已验证手机号');
    }
    const result = await this.otpService.sendSecurityCode(
      user.phone,
      CodeType.IDENTITY_CONFIRM,
      ip,
      userAgent,
      user.countryCode ?? '+86',
    );
    return { ...result, maskedTarget: this.maskPhone(user.phone) };
  }

  async sendEmailChangeCode(
    userId: string,
    email: string,
    ip: string,
    userAgent?: string,
  ) {
    const user = await this.requireUser(userId);
    if (user.email === email) {
      throw new BadRequestException('新邮箱不能与当前邮箱相同');
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('邮箱已被使用');
    return this.otpService.sendSecurityCode(
      email,
      CodeType.CHANGE_EMAIL,
      ip,
      userAgent,
    );
  }

  async sendPhoneChangeCode(
    userId: string,
    countryCode: string,
    phone: string,
    ip: string,
    userAgent?: string,
  ) {
    const user = await this.requireUser(userId);
    if (user.countryCode === countryCode && user.phone === phone) {
      throw new BadRequestException('新手机号不能与当前手机号相同');
    }
    const existing = await this.prisma.user.findUnique({
      where: {
        uq_users_country_code_phone: { countryCode, phone },
      },
    });
    if (existing) throw new ConflictException('手机号已被使用');
    return this.otpService.sendSecurityCode(
      phone,
      CodeType.CHANGE_PHONE,
      ip,
      userAgent,
      countryCode,
    );
  }

  async changeEmail(
    userId: string,
    dto: ChangeEmailDto,
    context: ContactChangeContext,
  ) {
    const user = await this.requireUser(userId);
    if (user.email === dto.email) {
      throw new BadRequestException('新邮箱不能与当前邮箱相同');
    }
    const proofCodeId = await this.verifyProof(user, dto);
    const newCodeId = await this.requireValidCode(
      dto.email,
      dto.newCode,
      VerificationCodeType.CHANGE_EMAIL,
    );
    const currentSession = await this.resolveCurrentSession(
      userId,
      context.currentRefreshToken,
    );
    const eventType = user.email
      ? UserSecurityAuditEventType.EMAIL_CHANGED
      : UserSecurityAuditEventType.EMAIL_BOUND;
    const oldValueEncrypted = user.email
      ? this.auditCrypto.encryptSnapshot({ kind: 'email', email: user.email })
      : null;
    const newValueEncrypted = this.auditCrypto.encryptSnapshot({
      kind: 'email',
      email: dto.email,
    });
    const changedAt = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const update = await tx.user.updateMany({
          where: {
            id: userId,
            email: user.email,
            updatedAt: user.updatedAt,
          },
          data: { email: dto.email, emailVerifiedAt: changedAt },
        });
        if (update.count !== 1) {
          throw new ConflictException('联系方式已发生变化，请刷新后重试');
        }
        const result = await tx.user.findUniqueOrThrow({
          where: { id: userId },
        });
        const audit = await tx.userSecurityAuditLog.create({
          data: {
            userId,
            eventType,
            oldValueEncrypted,
            newValueEncrypted,
            oldValueMasked: user.email ? this.maskEmail(user.email) : null,
            newValueMasked: this.maskEmail(dto.email),
            verificationMethod: dto.verificationMethod,
            ip: context.ip,
            userAgent: context.userAgent,
            deviceId: currentSession?.deviceId,
            encryptionKeyVersion: this.auditCrypto.keyVersion,
            createdAt: changedAt,
          },
        });
        await tx.securityNotificationOutbox.createMany({
          data: [
            ...(user.email
              ? [
                  {
                    auditLogId: audit.id,
                    channel: SecurityNotificationChannel.EMAIL,
                    recipient: SecurityNotificationRecipient.OLD,
                  },
                ]
              : []),
            {
              auditLogId: audit.id,
              channel: SecurityNotificationChannel.EMAIL,
              recipient: SecurityNotificationRecipient.NEW,
            },
          ],
        });
        await this.consumeCodes(tx, [proofCodeId, newCodeId]);
        const revoked = await tx.refreshToken.updateMany({
          where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: changedAt },
            ...(currentSession ? { id: { not: currentSession.id } } : {}),
          },
          data: { revokedAt: changedAt },
        });
        return {
          security: this.toSecurityResponse(result),
          revokedSessionsCount: revoked.count,
          currentSessionPreserved: Boolean(currentSession),
        };
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, '邮箱已被使用');
    }
  }

  async changePhone(
    userId: string,
    dto: ChangePhoneDto,
    context: ContactChangeContext,
  ) {
    const user = await this.requireUser(userId);
    if (user.countryCode === dto.countryCode && user.phone === dto.phone) {
      throw new BadRequestException('新手机号不能与当前手机号相同');
    }
    const proofCodeId = await this.verifyProof(user, dto);
    const newCodeId = await this.requireValidCode(
      dto.phone,
      dto.newCode,
      VerificationCodeType.CHANGE_PHONE,
    );
    const currentSession = await this.resolveCurrentSession(
      userId,
      context.currentRefreshToken,
    );
    const eventType = user.phone
      ? UserSecurityAuditEventType.PHONE_CHANGED
      : UserSecurityAuditEventType.PHONE_BOUND;
    const oldCountryCode = user.countryCode ?? '+86';
    const oldValueEncrypted = user.phone
      ? this.auditCrypto.encryptSnapshot({
          kind: 'phone',
          countryCode: oldCountryCode,
          phone: user.phone,
        })
      : null;
    const newValueEncrypted = this.auditCrypto.encryptSnapshot({
      kind: 'phone',
      countryCode: dto.countryCode,
      phone: dto.phone,
    });
    const changedAt = new Date();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const update = await tx.user.updateMany({
          where: {
            id: userId,
            countryCode: user.countryCode,
            phone: user.phone,
            updatedAt: user.updatedAt,
          },
          data: {
            countryCode: dto.countryCode,
            phone: dto.phone,
            phoneVerifiedAt: changedAt,
          },
        });
        if (update.count !== 1) {
          throw new ConflictException('联系方式已发生变化，请刷新后重试');
        }
        const result = await tx.user.findUniqueOrThrow({
          where: { id: userId },
        });
        const audit = await tx.userSecurityAuditLog.create({
          data: {
            userId,
            eventType,
            oldValueEncrypted,
            newValueEncrypted,
            oldValueMasked: user.phone
              ? this.maskPhoneContact(oldCountryCode, user.phone)
              : null,
            newValueMasked: this.maskPhoneContact(dto.countryCode, dto.phone),
            verificationMethod: dto.verificationMethod,
            ip: context.ip,
            userAgent: context.userAgent,
            deviceId: currentSession?.deviceId,
            encryptionKeyVersion: this.auditCrypto.keyVersion,
            createdAt: changedAt,
          },
        });
        await tx.securityNotificationOutbox.createMany({
          data: [
            ...(user.phone
              ? [
                  {
                    auditLogId: audit.id,
                    channel: SecurityNotificationChannel.PHONE,
                    recipient: SecurityNotificationRecipient.OLD,
                  },
                ]
              : []),
            {
              auditLogId: audit.id,
              channel: SecurityNotificationChannel.PHONE,
              recipient: SecurityNotificationRecipient.NEW,
            },
          ],
        });
        await this.consumeCodes(tx, [proofCodeId, newCodeId]);
        const revoked = await tx.refreshToken.updateMany({
          where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: changedAt },
            ...(currentSession ? { id: { not: currentSession.id } } : {}),
          },
          data: { revokedAt: changedAt },
        });
        return {
          security: this.toSecurityResponse(result),
          revokedSessionsCount: revoked.count,
          currentSessionPreserved: Boolean(currentSession),
        };
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, '手机号已被使用');
    }
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken?: string,
  ): Promise<{
    security: AccountSecurityResponseDto;
    revokedSessionsCount: number;
    currentSessionPreserved: boolean;
  }> {
    const user = await this.requireUser(userId);
    validatePassword(dto.newPassword);
    if (
      user.passwordHash &&
      (await bcrypt.compare(dto.newPassword, user.passwordHash))
    ) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }
    const proofCodeId = await this.verifyProof(user, dto);
    const passwordHash = await hashPassword(dto.newPassword);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordAlgo: 'bcrypt',
          passwordParams: { cost: 12 },
          passwordSetAt: new Date(),
        },
      });
      await this.consumeCodes(tx, [proofCodeId]);
      return result;
    });

    const currentSession = currentRefreshToken
      ? await this.refreshTokenRepo.findByToken(currentRefreshToken)
      : null;
    const preserveCurrent = Boolean(
      currentSession &&
        currentSession.userId === userId &&
        !currentSession.revokedAt &&
        currentSession.expiresAt > new Date(),
    );
    const revokedSessionsCount =
      await this.refreshTokenRepo.revokeAllTokensByUserId(
        userId,
        preserveCurrent ? currentSession!.id : undefined,
      );

    return {
      security: this.toSecurityResponse(updated),
      revokedSessionsCount,
      currentSessionPreserved: preserveCurrent,
    };
  }

  async listSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<SecuritySessionDto[]> {
    const current = currentRefreshToken
      ? await this.refreshTokenRepo.findByToken(currentRefreshToken)
      : null;
    const sessions = await this.refreshTokenRepo.findActiveByUserId(userId);
    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId ?? null,
      deviceInfo: session.deviceInfo ?? null,
      userAgent: session.userAgent ?? null,
      ip: session.ip ?? null,
      current: current?.id === session.id,
      createdAt: session.createdAt,
      lastActiveAt: session.updatedAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentRefreshToken?: string,
  ): Promise<{ success: true }> {
    const current = currentRefreshToken
      ? await this.refreshTokenRepo.findByToken(currentRefreshToken)
      : null;
    if (current?.id === sessionId) {
      throw new BadRequestException('当前会话请使用退出登录功能');
    }
    const revoked = await this.refreshTokenRepo.revokeByIdForUser(
      userId,
      sessionId,
    );
    if (!revoked) throw new NotFoundException('会话不存在');
    return { success: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<{ success: true; revokedSessionsCount: number }> {
    const current = currentRefreshToken
      ? await this.refreshTokenRepo.findByToken(currentRefreshToken)
      : null;
    const count = await this.refreshTokenRepo.revokeAllTokensByUserId(
      userId,
      current?.userId === userId ? current.id : undefined,
    );
    return { success: true, revokedSessionsCount: count };
  }

  async getLoginActivities(
    userId: string,
    query: LoginActivitiesQueryDto,
  ): Promise<LoginActivitiesResponseDto> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const where = { userId, createdAt: { gte: since } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loginLog.findMany({
        where,
        select: {
          id: true,
          loginType: true,
          success: true,
          ip: true,
          userAgent: true,
          failReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.loginLog.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private async verifyProof(
    user: Awaited<ReturnType<AccountSecurityService['requireUser']>>,
    proof: {
      verificationMethod: SecurityVerificationMethod;
      currentPassword?: string;
      identityCode?: string;
    },
  ): Promise<string | null> {
    if (proof.verificationMethod === SecurityVerificationMethod.PASSWORD) {
      if (!proof.currentPassword || proof.identityCode) {
        throw new BadRequestException('请仅提供当前密码进行身份确认');
      }
      if (!user.passwordHash) {
        throw new BadRequestException(
          '当前账号未设置密码，请使用验证码确认身份',
        );
      }
      if (!(await bcrypt.compare(proof.currentPassword, user.passwordHash))) {
        throw new BadRequestException('当前密码不正确');
      }
      return null;
    }

    if (!proof.identityCode || proof.currentPassword) {
      throw new BadRequestException('请仅提供身份验证码进行身份确认');
    }
    if (proof.verificationMethod === SecurityVerificationMethod.EMAIL_CODE) {
      if (!user.email || !user.emailVerifiedAt) {
        throw new BadRequestException('当前账号没有已验证邮箱');
      }
      return this.requireValidCode(
        user.email,
        proof.identityCode,
        VerificationCodeType.IDENTITY_CONFIRM,
      );
    }
    if (!user.phone || !user.phoneVerifiedAt) {
      throw new BadRequestException('当前账号没有已验证手机号');
    }
    return this.requireValidCode(
      user.phone,
      proof.identityCode,
      VerificationCodeType.IDENTITY_CONFIRM,
    );
  }

  private async requireValidCode(
    target: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<string> {
    const record = await this.prisma.verificationCode.findFirst({
      where: { target, type, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.attemptCount >= MAX_CODE_ATTEMPTS) {
      throw new BadRequestException('验证码无效或已过期');
    }
    if (record.code !== code) {
      const nextAttempts = record.attemptCount + 1;
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          attemptCount: { increment: 1 },
          ...(nextAttempts >= MAX_CODE_ATTEMPTS ? { used: true } : {}),
        },
      });
      throw new BadRequestException('验证码无效或已过期');
    }
    return record.id;
  }

  private async consumeCodes(
    tx: Prisma.TransactionClient,
    ids: Array<string | null>,
  ): Promise<void> {
    const validIds = ids.filter((id): id is string => Boolean(id));
    if (!validIds.length) return;
    const result = await tx.verificationCode.updateMany({
      where: { id: { in: validIds }, used: false },
      data: { used: true },
    });
    if (result.count !== validIds.length) {
      throw new BadRequestException('验证码已被使用，请重新获取');
    }
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  private toSecurityResponse(
    user: Awaited<ReturnType<AccountSecurityService['requireUser']>>,
  ): AccountSecurityResponseDto {
    const methods: SecurityVerificationMethod[] = [];
    if (user.passwordHash) methods.push(SecurityVerificationMethod.PASSWORD);
    if (user.email && user.emailVerifiedAt) {
      methods.push(SecurityVerificationMethod.EMAIL_CODE);
    }
    if (user.phone && user.phoneVerifiedAt) {
      methods.push(SecurityVerificationMethod.PHONE_CODE);
    }
    return {
      hasPassword: Boolean(user.passwordHash),
      passwordSetAt: user.passwordSetAt,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      countryCode: user.countryCode,
      phone: user.phone,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      availableVerificationMethods: methods,
    };
  }

  private rethrowUniqueConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }

  private maskPhoneContact(countryCode: string, phone: string): string {
    return `${countryCode} ${this.maskPhone(phone)}`;
  }

  private async resolveCurrentSession(
    userId: string,
    currentRefreshToken?: string,
  ) {
    if (!currentRefreshToken) return null;
    const session =
      await this.refreshTokenRepo.findByToken(currentRefreshToken);
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      return null;
    }
    return session;
  }
}
