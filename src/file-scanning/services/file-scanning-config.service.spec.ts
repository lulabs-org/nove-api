import { FileScanProvider } from '@/generated/prisma/client';
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

  it('prefers the dedicated file-scanning module when stored in database', async () => {
    integrations.getEffectiveConfig.mockImplementation((_orgId, module) =>
      Promise.resolve(
        module === 'file-scanning'
          ? {
              source: 'database',
              value: {
                malwareScanProvider: FileScanProvider.CLAMAV,
                clamAvHost: 'clamav.internal',
              },
            }
          : {
              source: 'database',
              value: { malwareScanProvider: FileScanProvider.ALIYUN_SAS },
            },
      ),
    );

    const config = await service.getConfig();

    expect(integrations.getEffectiveConfig).toHaveBeenCalledWith(
      'org-123',
      'file-scanning',
    );
    expect(config.malwareScanProvider).toBe(FileScanProvider.CLAMAV);
    expect(config.clamAvHost).toBe('clamav.internal');
  });

  it('falls back to legacy drive config when file-scanning is not stored in database', async () => {
    integrations.getEffectiveConfig.mockImplementation((_orgId, module) =>
      Promise.resolve(
        module === 'file-scanning'
          ? { source: 'default', value: {} }
          : {
              source: 'database',
              value: {
                malwareScanProvider: FileScanProvider.ALIYUN_SAS,
                aliyunSasRegionId: 'cn-beijing',
              },
            },
      ),
    );

    const config = await service.getConfig();

    expect(integrations.getEffectiveConfig).toHaveBeenCalledWith(
      'org-123',
      'drive',
    );
    expect(config.malwareScanProvider).toBe(FileScanProvider.ALIYUN_SAS);
    expect(config.aliyunSasRegionId).toBe('cn-beijing');
  });

  it('returns empty object when no stored configuration exists', async () => {
    integrations.getEffectiveConfig.mockResolvedValue({
      source: 'default',
      value: null,
    });

    const config = await service.getConfig();

    expect(config).toEqual({});
  });
});
