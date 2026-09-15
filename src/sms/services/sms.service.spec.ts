import { SmsDeliveryError, SmsService } from './sms.service';

describe('SmsService', () => {
  const config = {
    accessKeyId: 'access-key-id',
    accessKeySecret: 'access-key-secret',
    signName: '测试签名',
    verificationTemplateCode: 'SMS_VERIFICATION',
    securityChangeTemplateCode: 'SMS_SECURITY_CHANGE',
  };

  function createService(sendSmsWithOptions: jest.Mock) {
    const configService = {
      getRequiredConfig: jest.fn().mockResolvedValue(config),
    };
    const service = new SmsService(configService as never);
    (
      service as unknown as {
        getClient: () => { sendSmsWithOptions: jest.Mock };
      }
    ).getClient = jest.fn(() => ({ sendSmsWithOptions }));
    return { service, configService };
  }

  it('extracts actionable error message directly from provider response', async () => {
    const { service } = createService(
      jest.fn().mockResolvedValue({
        body: {
          code: 'isv.SMS_TEST_NUMBER_LIMIT',
          message: '只能向已绑定的测试手机号发送短信',
          requestId: 'request-1',
        },
      }),
    );

    await expect(
      service.sendSms('13800138000', '123456'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      providerCode: 'isv.SMS_TEST_NUMBER_LIMIT',
      message: '只能向已绑定的测试手机号发送短信',
    });
  });

  it('preserves exception message when provider rejects with error', async () => {
    const { service } = createService(
      jest.fn().mockRejectedValue(
        Object.assign(new Error('internal provider details'), {
          code: 'InternalError',
          requestId: 'request-2',
        }),
      ),
    );

    await expect(
      service.sendSms('13800138000', '123456'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      message: 'internal provider details',
      providerCode: 'InternalError',
    });
  });

  it('extracts message when provider returns unknown error code', async () => {
    const { service } = createService(
      jest.fn().mockResolvedValue({
        body: {
          code: 'UNKNOWN',
          message: '只能向已回复授权信息的手机号发送',
        },
      }),
    );

    await expect(
      service.sendSms('13800138000', '123456'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      message: '只能向已回复授权信息的手机号发送',
      providerCode: 'UNKNOWN',
    });
  });

  it('extracts template restriction error message directly', async () => {
    const { service } = createService(
      jest.fn().mockResolvedValue({
        body: {
          code: 'isv.SMS_TEST_SIGN_TEMPLATE_LIMIT',
          message: 'Test template and signature restrictions',
          requestId: 'request-3',
        },
      }),
    );

    await expect(
      service.sendSms('13800138000', '123456'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      providerCode: 'isv.SMS_TEST_SIGN_TEMPLATE_LIMIT',
      message: 'Test template and signature restrictions',
    });
  });

  it('cleans Chinese mainland numbers by stripping any +86 prefix', async () => {
    const sendSmsWithOptions = jest.fn().mockResolvedValue({
      body: { code: 'OK', requestId: 'request-4' },
    });
    const { service } = createService(sendSmsWithOptions);

    await service.sendSms('+8613800138000', '123456');

    expect(sendSmsWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: '13800138000',
        templateCode: 'SMS_VERIFICATION',
      }),
      expect.anything(),
    );
  });

  it('uses the dedicated security-change template without a verification code', async () => {
    const sendSmsWithOptions = jest.fn().mockResolvedValue({
      body: { code: 'OK', requestId: 'request-5' },
    });
    const { service } = createService(sendSmsWithOptions);

    await service.sendSecurityNotice(
      '13800138000',
      '手机号',
      '+86 139****0000',
      '2026/8/31 10:00:00',
    );

    expect(sendSmsWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        templateCode: 'SMS_SECURITY_CHANGE',
        templateParam: JSON.stringify({
          contactType: '手机号',
          newContact: '+86 139****0000',
          changedAt: '2026/8/31 10:00:00',
        }),
      }),
      expect.anything(),
    );
  });

  it('loads fresh database configuration before every send', async () => {
    const sendSmsWithOptions = jest.fn().mockResolvedValue({
      body: { code: 'OK', requestId: 'request-6' },
    });
    const { service, configService } = createService(sendSmsWithOptions);

    await service.sendSms('13800138000', '123456');
    await service.sendSms('13800138000', '654321');

    expect(configService.getRequiredConfig).toHaveBeenCalledTimes(2);
  });

  it('reports missing or unreadable database configuration uniformly', async () => {
    const { service, configService } = createService(jest.fn());
    configService.getRequiredConfig.mockRejectedValue(
      new Error('decrypt failed'),
    );

    await expect(
      service.sendSms('13800138000', '123456'),
    ).rejects.toMatchObject({
      message: '短信服务尚未配置',
      providerCode: 'SMS_NOT_CONFIGURED',
    });
  });
});
