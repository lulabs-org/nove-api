import { FileScanProvider } from '@prisma/client';
import { FileScanningConfigService } from './file-scanning-config.service';

describe('FileScanningConfigService', () => {
  const integrations = {
    getEffectiveConfig: jest.fn(),
  };
  const orgContext = {
    getOrgId: jest.fn().mockReturnValue('org-123'),
  };
  const service = new FileScanningConfigService(
    integrations as never,
    orgContext as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to drive config when file-scanning is not registered', async () => {
    integrations.getEffectiveConfig.mockResolvedValue({
      value: {
        malwareScanProvider: FileScanProvider.ALIYUN_SAS,
        aliyunSasRegionId: 'cn-beijing',
      },
    });

    const config = await service.getConfig();

    expect(integrations.getEffectiveConfig).toHaveBeenCalledWith(
      'org-123',
      'drive',
    );
    expect(config.malwareScanProvider).toBe(FileScanProvider.ALIYUN_SAS);
    expect(config.aliyunSasRegionId).toBe('cn-beijing');
  });

  it('returns empty object when drive config value is null or undefined', async () => {
    integrations.getEffectiveConfig.mockResolvedValue({
      value: null,
    });

    const config = await service.getConfig();

    expect(config).toEqual({});
  });
});
