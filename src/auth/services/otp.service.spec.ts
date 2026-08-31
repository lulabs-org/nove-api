import { BadRequestException } from '@nestjs/common';
import { CodeType } from '@/common/enums';
import { SmsDeliveryError } from '@/sms/sms.service';
import { OtpService } from './otp.service';

describe('OtpService delivery accounting', () => {
  const repo = {
    countSentToTargetSince: jest.fn(),
    countSentFromIpSince: jest.fn(),
    createVerificationCode: jest.fn(),
    deleteVerificationCode: jest.fn(),
    invalidateActiveCodes: jest.fn(),
    upsertSendLimit: jest.fn(),
  };
  const mailService = { sendVerificationCode: jest.fn() };
  const smsService = { sendSms: jest.fn() };
  let service: OtpService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.countSentToTargetSince.mockResolvedValue(0);
    repo.countSentFromIpSince.mockResolvedValue(0);
    repo.createVerificationCode.mockResolvedValue({ id: 'code-1' });
    repo.deleteVerificationCode.mockResolvedValue(undefined);
    repo.invalidateActiveCodes.mockResolvedValue(undefined);
    repo.upsertSendLimit.mockResolvedValue(undefined);
    service = new OtpService(
      repo as never,
      mailService as never,
      smsService as never,
    );
  });

  it('removes a newly-created code and does not consume quota when SMS delivery fails', async () => {
    smsService.sendSms.mockRejectedValue(
      new SmsDeliveryError('短信服务暂时不可用，请稍后重试'),
    );

    await expect(
      service.sendSecurityCode(
        '13800138000',
        CodeType.CHANGE_PHONE,
        '127.0.0.1',
        'test-agent',
        '+86',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.deleteVerificationCode).toHaveBeenCalledWith('code-1');
    expect(repo.invalidateActiveCodes).not.toHaveBeenCalled();
    expect(repo.upsertSendLimit).not.toHaveBeenCalled();
  });

  it('invalidates older codes and consumes quota only after successful delivery', async () => {
    smsService.sendSms.mockResolvedValue(undefined);

    await expect(
      service.sendSecurityCode(
        '13800138000',
        CodeType.CHANGE_PHONE,
        '127.0.0.1',
        'test-agent',
        '+86',
      ),
    ).resolves.toMatchObject({ success: true });

    expect(repo.deleteVerificationCode).not.toHaveBeenCalled();
    expect(repo.invalidateActiveCodes).toHaveBeenCalledWith(
      '13800138000',
      expect.anything(),
      'code-1',
    );
    expect(repo.upsertSendLimit).toHaveBeenCalledTimes(1);
  });
});
