import { encrypt } from '@/common/utils/crypto.util';
import { IntegrationsRepository } from '@/admin/integrations/repositories';
import { AliyunSmsConfigService } from './aliyun-sms-config.service';

describe('AliyunSmsConfigService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reads and decrypts the single organization integration config', async () => {
    const findFirstByKey = jest.fn().mockResolvedValue({
      value: {
        accessKeyId: encrypt('key-id'),
        accessKeySecret: encrypt('key-secret'),
        signName: '测试签名',
        verificationTemplateCode: 'SMS_VERIFICATION1',
        securityChangeTemplateCode: 'SMS_SECURITY1',
      },
    });
    const repository = {
      findFirstByKey,
    } as unknown as IntegrationsRepository;
    const service = new AliyunSmsConfigService(repository);

    await expect(service.getRequiredConfig()).resolves.toMatchObject({
      accessKeyId: 'key-id',
      accessKeySecret: 'key-secret',
      verificationTemplateCode: 'SMS_VERIFICATION1',
    });
    expect(findFirstByKey).toHaveBeenCalledWith('ALIYUN_SMS_CONFIG');
  });

  it('uses the same unconfigured error for missing and unreadable credentials', async () => {
    const repository = {
      findFirstByKey: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          value: {
            accessKeyId: 'broken',
            accessKeySecret: 'broken',
            signName: '测试签名',
          },
        }),
    } as unknown as IntegrationsRepository;
    const service = new AliyunSmsConfigService(repository);

    await expect(service.getRequiredConfig()).rejects.toThrow(
      'SMS_NOT_CONFIGURED',
    );
    await expect(service.getRequiredConfig()).rejects.toThrow(
      'SMS_NOT_CONFIGURED',
    );
  });
});
