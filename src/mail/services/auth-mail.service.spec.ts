import { AuthMailService } from './auth-mail.service';

interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

type SendCall = [SentEmail, { maskTargetInLogs: boolean }];

describe('AuthMailService', () => {
  const mailService = { sendSimpleEmail: jest.fn() };
  const brandResolver = {
    resolve: jest.fn().mockResolvedValue({
      name: 'Nove System',
      logoUrl: null,
      primaryColor: '#2563eb',
      footerText: 'Nove System 自动邮件',
    }),
  };
  let service: AuthMailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mailService.sendSimpleEmail.mockResolvedValue(undefined);
    service = new AuthMailService(mailService as never, brandResolver as never);
  });

  it('sends verification messages with text and masked logging', async () => {
    await service.sendVerificationCode(
      'user@example.com',
      '123456',
      'security',
    );

    const [[message, options]] = mailService.sendSimpleEmail.mock
      .calls as unknown as SendCall[];
    expect(message.to).toBe('user@example.com');
    expect(message.subject).toBe('Nove System 安全操作验证码');
    expect(message.html).toContain('123456');
    expect(message.text).toContain('123456');
    expect(options).toEqual({ maskTargetInLogs: true });
    expect(brandResolver.resolve).toHaveBeenCalledWith(undefined);
  });

  it('sends welcome, password, and contact notifications through one policy', async () => {
    await service.sendWelcomeEmail('user@example.com', 'Alice');
    await service.sendPasswordResetNotification(
      'user@example.com',
      'Alice',
      new Date('2026-08-31T00:00:00.000Z'),
    );
    await service.sendContactChangeNotification('user@example.com', {
      contactLabel: '邮箱',
      newContactMasked: 'ne***@example.com',
      changedAt: new Date('2026-08-31T00:00:00.000Z'),
      recipient: 'OLD',
    });

    expect(mailService.sendSimpleEmail).toHaveBeenCalledTimes(3);
    const calls = mailService.sendSimpleEmail.mock
      .calls as unknown as SendCall[];
    for (const [message, options] of calls) {
      expect(options).toEqual({ maskTargetInLogs: true });
      expect(message.html).toContain('Nove System');
      expect(typeof message.text).toBe('string');
    }
  });

  it('resolves a trusted organization brand context', async () => {
    await service.sendWelcomeEmail('user@example.com', 'Alice', {
      orgId: 'org-1',
    });

    expect(brandResolver.resolve).toHaveBeenCalledWith({ orgId: 'org-1' });
  });
});
