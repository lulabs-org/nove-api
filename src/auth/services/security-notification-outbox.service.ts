import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SecurityNotificationChannel,
  SecurityNotificationRecipient,
  SecurityNotificationStatus,
  UserSecurityAuditEventType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthMailService } from '@/mail/services/auth-mail.service';
import { SmsDeliveryError, SmsService } from '@/sms/sms.service';
import { SecurityAuditCryptoService } from './security-audit-crypto.service';

const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
const MAX_DELIVERY_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
const STALE_CLAIM_MS = 10 * 60_000;

@Injectable()
export class SecurityNotificationOutboxService {
  private readonly logger = new Logger(SecurityNotificationOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecurityAuditCryptoService,
    private readonly authMailService: AuthMailService,
    private readonly smsService: SmsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPending(): Promise<void> {
    const now = new Date();
    await this.prisma.securityNotificationOutbox.updateMany({
      where: {
        status: SecurityNotificationStatus.PROCESSING,
        claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
      },
      data: {
        status: SecurityNotificationStatus.PENDING,
        claimedAt: null,
        nextAttemptAt: now,
      },
    });

    const candidates = await this.prisma.securityNotificationOutbox.findMany({
      where: {
        status: SecurityNotificationStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      select: { id: true },
      orderBy: { nextAttemptAt: 'asc' },
      take: 20,
    });

    for (const candidate of candidates) {
      await this.claimAndDeliver(candidate.id, now);
    }
  }

  private async claimAndDeliver(id: string, claimedAt: Date): Promise<void> {
    const claimed = await this.prisma.securityNotificationOutbox.updateMany({
      where: { id, status: SecurityNotificationStatus.PENDING },
      data: {
        status: SecurityNotificationStatus.PROCESSING,
        claimedAt,
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return;

    const item = await this.prisma.securityNotificationOutbox.findUnique({
      where: { id },
      include: { auditLog: true },
    });
    if (!item) return;

    try {
      const ciphertext =
        item.recipient === SecurityNotificationRecipient.OLD
          ? item.auditLog.oldValueEncrypted
          : item.auditLog.newValueEncrypted;
      if (!ciphertext) throw new Error('CONTACT_SNAPSHOT_MISSING');
      const snapshot = this.crypto.decryptSnapshot(ciphertext);
      const contactLabel = this.getContactLabel(item.auditLog.eventType);

      if (item.channel === SecurityNotificationChannel.EMAIL) {
        if (snapshot.kind !== 'email') throw new Error('CONTACT_KIND_MISMATCH');
        await this.authMailService.sendContactChangeNotification(
          snapshot.email,
          {
            contactLabel,
            newContactMasked: item.auditLog.newValueMasked,
            changedAt: item.auditLog.createdAt,
            recipient: item.recipient,
          },
        );
      } else {
        if (snapshot.kind !== 'phone') throw new Error('CONTACT_KIND_MISMATCH');
        await this.smsService.sendSecurityChangeNotice(
          snapshot.phone,
          snapshot.countryCode,
          contactLabel,
          item.auditLog.newValueMasked,
          item.auditLog.createdAt.toLocaleString('zh-CN', { hour12: false }),
        );
      }

      await this.prisma.securityNotificationOutbox.update({
        where: { id },
        data: {
          status: SecurityNotificationStatus.SENT,
          sentAt: new Date(),
          claimedAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const terminal = item.attemptCount >= MAX_DELIVERY_ATTEMPTS;
      const delay = RETRY_DELAYS_MS[Math.min(item.attemptCount - 1, 4)];
      const lastError = this.toSafeError(error);
      await this.prisma.securityNotificationOutbox.update({
        where: { id },
        data: {
          status: terminal
            ? SecurityNotificationStatus.FAILED
            : SecurityNotificationStatus.PENDING,
          nextAttemptAt: new Date(Date.now() + delay),
          claimedAt: null,
          lastError,
        },
      });
      this.logger.error(
        `security_notification_delivery_failed id=${id} attempt=${item.attemptCount} terminal=${terminal} reason=${lastError}`,
      );
    }
  }

  private getContactLabel(
    eventType: UserSecurityAuditEventType,
  ): '邮箱' | '手机号' {
    return eventType === UserSecurityAuditEventType.EMAIL_BOUND ||
      eventType === UserSecurityAuditEventType.EMAIL_CHANGED
      ? '邮箱'
      : '手机号';
  }

  private toSafeError(error: unknown): string {
    if (error instanceof SmsDeliveryError) {
      return error.providerCode ?? 'SMS_DELIVERY_FAILED';
    }
    if (error instanceof Error && /^[A-Z_]+$/.test(error.message)) {
      return error.message;
    }
    return 'DELIVERY_FAILED';
  }
}
