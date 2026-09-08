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
});
