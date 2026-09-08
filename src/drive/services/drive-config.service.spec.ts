import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntegrationsService } from '@/admin/integrations';
import { IntegrationsRepository } from '@/admin/integrations/repositories';
import { SingleOrgContextService } from '@/admin/org';
import { DriveConfigService } from './drive-config.service';

describe('Drive configuration after integrations migration', () => {
  const repository = { findByKey: jest.fn() };
  const orgContext = { getOrgId: jest.fn() };
  const integrations = new IntegrationsService(
    repository as unknown as IntegrationsRepository,
    new EventEmitter2(),
  );
  const service = new DriveConfigService(
    integrations,
    orgContext as unknown as SingleOrgContextService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    orgContext.getOrgId.mockReturnValue('org-a');
    repository.findByKey.mockResolvedValue(null);
  });

  it('reads only the current organization and preserves policy defaults and arrays', async () => {
    repository.findByKey.mockResolvedValue({
      value: { allowedExtensions: ['.pdf'], downloadUrlExpiresSeconds: 120 },
      updatedAt: new Date(),
    });
    await expect(service.getConfig()).resolves.toMatchObject({
      allowedExtensions: ['.pdf'],
      downloadUrlExpiresSeconds: 120,
      recycleRetentionDays: 30,
    });
    expect(repository.findByKey).toHaveBeenCalledWith('org-a', 'DRIVE_CONFIG');
  });

  it('accepts scoped drive configuration without a legacy default organization', async () => {
    await expect(
      integrations.resolveDraftConfig('org-a', 'drive', {
        allowedExtensions: ['.pdf'],
        malwareScanProvider: 'CLAMAV',
      }),
    ).resolves.toMatchObject({ orgId: 'org-a', module: 'drive' });
    await expect(
      integrations.resolveDraftConfig('org-a', 'drive', {
        allowedExtensions: [123],
      }),
    ).rejects.toThrow();
  });

  it('fails closed when the organization context is unavailable', async () => {
    orgContext.getOrgId.mockImplementation(() => {
      throw new Error('Organization context unavailable');
    });
    await expect(service.getConfig()).rejects.toThrow(
      'Organization context unavailable',
    );
    expect(repository.findByKey).not.toHaveBeenCalled();
  });
});
