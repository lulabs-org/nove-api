import { IntegrationTesterService } from '@/admin/integrations/services';
import { RedisService } from '@/redis/redis.service';
import { AliyunSmsTester } from './aliyun-sms.tester';
import { SmsService } from './services';

describe('AliyunSmsTester', () => {
  it('registers with the shared tester and rate-limits a target without OTP state', async () => {
    const registerProvider = jest.fn();
    const sendTestSms = jest.fn().mockResolvedValue(undefined);
    const testerService = {
      registerProvider,
    } as unknown as IntegrationTesterService;
    const smsService = {
      sendTestSms,
    } as unknown as SmsService;
    const redisService = {
      getClient: jest.fn().mockReturnValue(undefined),
    } as unknown as RedisService;
    const tester = new AliyunSmsTester(testerService, smsService, redisService);
    const value = { testCountryCode: '+86', testPhoneNumber: '13800138000' };

    tester.onModuleInit();
    expect(registerProvider).toHaveBeenCalledWith('aliyun-sms', tester);
    await tester.test(value);
    await tester.test(value);
    await tester.test(value);
    await expect(tester.test(value)).rejects.toThrow('SMS_TEST_RATE_LIMITED');
    expect(sendTestSms).toHaveBeenCalledTimes(3);
    expect(sendTestSms).toHaveBeenCalledWith(
      '13800138000',
      '+86',
      expect.objectContaining(value),
    );
  });
});
