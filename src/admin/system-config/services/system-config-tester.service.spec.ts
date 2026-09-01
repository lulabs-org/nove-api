import { SystemConfigService } from './system-config.service';
import { SystemConfigTesterService } from './system-config-tester.service';

describe('SystemConfigTesterService', () => {
  const systemConfigService = {
    resolveDraftConfig: jest.fn().mockResolvedValue({ value: {} }),
  } as unknown as SystemConfigService;

  it('returns a successful transient result without persisting state', async () => {
    const service = new SystemConfigTesterService(systemConfigService);
    jest
      .spyOn(service as never, 'runTest')
      .mockResolvedValue(undefined as never);

    await expect(service.testConfig('mail', {})).resolves.toEqual({
      success: true,
      message: '连接测试成功',
    });
  });

  it('sanitizes provider failures', async () => {
    const service = new SystemConfigTesterService(systemConfigService);
    jest
      .spyOn(service as never, 'runTest')
      .mockRejectedValue(new Error('secret provider response') as never);

    await expect(service.testConfig('ai', {})).resolves.toEqual({
      success: false,
      message: '连接测试失败，请检查凭证、服务权限和网络配置',
    });
  });
});
