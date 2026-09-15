import { CodeType } from '@/common/enums';
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
        createClient: () => { sendSmsWithOptions: jest.Mock };
      }
    ).createClient = jest.fn(() => ({ sendSmsWithOptions }));
    return { service, configService };
  }

  it('maps the Aliyun test-number restriction to an actionable message', async () => {
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
      service.sendSms('13800138000', '123456', CodeType.CHANGE_PHONE, '+86'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      providerCode: 'isv.SMS_TEST_NUMBER_LIMIT',
      message:
        '当前使用的是阿里云测试短信，只能发送给已绑定的测试手机号。请先在阿里云短信控制台绑定该号码，或改用审核通过的正式签名和模板',
    });
  });

  it('does not expose unexpected provider errors to API callers', async () => {
    const { service } = createService(
      jest.fn().mockRejectedValue(
        Object.assign(new Error('internal provider details'), {
          code: 'InternalError',
          requestId: 'request-2',
        }),
      ),
    );

    await expect(
      service.sendSms('13800138000', '123456', CodeType.LOGIN, '+86'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      message: '短信服务暂时不可用，请稍后重试',
      providerCode: 'InternalError',
    });
  });

  it('recognizes the test-number restriction when Aliyun omits the error code', async () => {
    const { service } = createService(
      jest.fn().mockResolvedValue({
        body: {
          code: 'UNKNOWN',
          message: '只能向已回复授权信息的手机号发送',
        },
      }),
    );

    await expect(
      service.sendSms('13800138000', '123456', CodeType.LOGIN, '+86'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      message:
        '当前使用的是阿里云测试短信，只能发送给已绑定的测试手机号。请先在阿里云短信控制台绑定该号码，或改用审核通过的正式签名和模板',
    });
  });

  it('maps a mixed test and production signature/template pair to configuration guidance', async () => {
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
      service.sendSms('13800138000', '123456', CodeType.CHANGE_PHONE, '+86'),
    ).rejects.toMatchObject<SmsDeliveryError>({
      name: 'SmsDeliveryError',
      providerCode: 'isv.SMS_TEST_SIGN_TEMPLATE_LIMIT',
      message:
        '阿里云短信签名与模板类型不匹配。请检查平台治理中的阿里云短信签名和验证码模板配置',
    });
  });

  it('sends Chinese mainland numbers in the same 11-digit format used by test bindings', async () => {
    const sendSmsWithOptions = jest.fn().mockResolvedValue({
      body: { code: 'OK', requestId: 'request-4' },
    });
    const { service } = createService(sendSmsWithOptions);

    await service.sendSms(
      '13800138000',
      '123456',
      CodeType.CHANGE_PHONE,
      '+86',
    );

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

    await service.sendSecurityChangeNotice(
      '13800138000',
      '+86',
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

    await service.sendSms('13800138000', '123456', CodeType.LOGIN, '+86');
    await service.sendSms('13800138000', '654321', CodeType.LOGIN, '+86');

    expect(configService.getRequiredConfig).toHaveBeenCalledTimes(2);
  });

  it('reports missing or unreadable database configuration uniformly', async () => {
    const { service, configService } = createService(jest.fn());
    configService.getRequiredConfig.mockRejectedValue(
      new Error('decrypt failed'),
    );

    await expect(
      service.sendSms('13800138000', '123456', CodeType.LOGIN, '+86'),
    ).rejects.toMatchObject({
      message: '短信服务尚未配置',
      providerCode: 'SMS_NOT_CONFIGURED',
    });
  });
});
