import {
  SecurityNotificationChannel,
  SecurityNotificationRecipient,
  SecurityNotificationStatus,
  UserSecurityAuditEventType,
} from '@prisma/client';
import { SecurityNotificationOutboxService } from './security-notification-outbox.service';

const firstMockArgument = (mock: jest.Mock): unknown =>
  (mock.mock.calls as unknown[][])[0]?.[0];

describe('SecurityNotificationOutboxService', () => {
  const outbox = {
    updateMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { securityNotificationOutbox: outbox };
  const crypto = { decryptSnapshot: jest.fn() };
  const mail = { sendSimpleEmail: jest.fn() };
  const sms = { sendSecurityChangeNotice: jest.fn() };
  let service: SecurityNotificationOutboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityNotificationOutboxService(
      prisma as never,
      crypto as never,
      mail as never,
      sms as never,
    );
    outbox.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    outbox.findMany.mockResolvedValue([{ id: 'outbox-1' }]);
  });

  it('claims and sends an email notification without exposing the target', async () => {
    outbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      channel: SecurityNotificationChannel.EMAIL,
      recipient: SecurityNotificationRecipient.OLD,
      attemptCount: 1,
      auditLog: {
        eventType: UserSecurityAuditEventType.EMAIL_CHANGED,
        oldValueEncrypted: 'cipher-old',
        newValueEncrypted: 'cipher-new',
        newValueMasked: 'ne***@example.com',
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
      },
    });
    crypto.decryptSnapshot.mockReturnValue({
      kind: 'email',
      email: 'old@example.com',
    });

    await service.processPending();

    expect(mail.sendSimpleEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'old@example.com' }),
      { maskTargetInLogs: true },
    );
    const updateInput = firstMockArgument(outbox.update);
    expect(updateInput).toMatchObject({
      data: { status: SecurityNotificationStatus.SENT },
    });
  });

  it('returns failed work to pending with a safe retry reason', async () => {
    outbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      channel: SecurityNotificationChannel.PHONE,
      recipient: SecurityNotificationRecipient.NEW,
      attemptCount: 1,
      auditLog: {
        eventType: UserSecurityAuditEventType.PHONE_CHANGED,
        oldValueEncrypted: 'cipher-old',
        newValueEncrypted: 'cipher-new',
        newValueMasked: '+86 139****0000',
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
      },
    });
    crypto.decryptSnapshot.mockReturnValue({
      kind: 'phone',
      countryCode: '+86',
      phone: '13900000000',
    });
    sms.sendSecurityChangeNotice.mockRejectedValue(
      new Error('provider leaked details'),
    );

    await service.processPending();

    expect(sms.sendSecurityChangeNotice).toHaveBeenCalledWith(
      '13900000000',
      '+86',
      '手机号',
      '+86 139****0000',
      expect.any(String),
    );
    const updateInput = firstMockArgument(outbox.update);
    expect(updateInput).toMatchObject({
      data: {
        status: SecurityNotificationStatus.PENDING,
        lastError: 'DELIVERY_FAILED',
      },
    });
  });

  it('marks a notification failed after the initial attempt and five retries', async () => {
    outbox.findUnique.mockResolvedValue({
      id: 'outbox-1',
      channel: SecurityNotificationChannel.EMAIL,
      recipient: SecurityNotificationRecipient.NEW,
      attemptCount: 6,
      auditLog: {
        eventType: UserSecurityAuditEventType.EMAIL_CHANGED,
        oldValueEncrypted: 'cipher-old',
        newValueEncrypted: 'cipher-new',
        newValueMasked: 'ne***@example.com',
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
      },
    });
    crypto.decryptSnapshot.mockReturnValue({
      kind: 'email',
      email: 'new@example.com',
    });
    mail.sendSimpleEmail.mockRejectedValue(new Error('provider failure'));

    await service.processPending();

    const updateInput = firstMockArgument(outbox.update);
    expect(updateInput).toMatchObject({
      data: {
        status: SecurityNotificationStatus.FAILED,
        lastError: 'DELIVERY_FAILED',
      },
    });
  });
});
