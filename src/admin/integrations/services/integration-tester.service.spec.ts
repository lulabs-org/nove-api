import { IntegrationsService } from './integrations.service';
import { IntegrationTesterService } from './integration-tester.service';

describe('IntegrationTesterService', () => {
  const integrationsService = {
    resolveDraftConfig: jest.fn().mockResolvedValue({ value: {} }),
  } as unknown as IntegrationsService;

  it('returns a successful transient result without persisting state', async () => {
    const service = new IntegrationTesterService(integrationsService);
    jest
      .spyOn(service as never, 'runTest')
      .mockResolvedValue(undefined as never);

    await expect(service.testIntegration('org-1', 'mail', {})).resolves.toEqual(
      {
        orgId: 'org-1',
        success: true,
        message: '连接测试成功',
      },
    );
  });

  it('sanitizes provider failures', async () => {
    const service = new IntegrationTesterService(integrationsService);
    jest
      .spyOn(service as never, 'runTest')
      .mockRejectedValue(new Error('secret provider response') as never);

    await expect(service.testIntegration('org-1', 'ai', {})).resolves.toEqual({
      orgId: 'org-1',
      success: false,
      message: '连接测试失败，请检查凭证、服务权限和网络配置',
    });
  });

  it('keeps SMS target fields transient while testing the shared configuration', async () => {
    const resolveDraftConfig = jest
      .fn()
      .mockResolvedValue({ value: { signName: '签名' } });
    const service = new IntegrationTesterService({
      resolveDraftConfig,
    } as never);
    const provider = { test: jest.fn().mockResolvedValue(undefined) };
    service.registerProvider('aliyun-sms', provider);

    const result = await service.testIntegration('org-1', 'aliyun-sms', {
      signName: '签名',
      testCountryCode: '+86',
      testPhoneNumber: '13800138000',
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('测试短信');
    expect(resolveDraftConfig).toHaveBeenCalledWith('org-1', 'aliyun-sms', {
      signName: '签名',
    });
    expect(provider.test).toHaveBeenCalledWith({
      signName: '签名',
      testCountryCode: '+86',
      testPhoneNumber: '13800138000',
    });
  });
});
