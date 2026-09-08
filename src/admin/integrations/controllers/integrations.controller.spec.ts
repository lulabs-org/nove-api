import { ForbiddenException } from '@nestjs/common';
import { IntegrationsService, IntegrationTesterService } from '../services';
import { IntegrationsController } from './integrations.controller';

describe('IntegrationsController', () => {
  const listIntegrations = jest.fn();
  const getIntegration = jest.fn();
  const updateIntegration = jest.fn();
  const deleteIntegration = jest.fn();
  const testIntegration = jest.fn();
  const integrationsService = {
    listIntegrations,
    getIntegration,
    updateIntegration,
    deleteIntegration,
  } as unknown as jest.Mocked<IntegrationsService>;
  const testerService = {
    testIntegration,
  } as unknown as jest.Mocked<IntegrationTesterService>;
  const controller = new IntegrationsController(
    integrationsService,
    testerService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated organization to every operation', async () => {
    await controller.list('org-1');
    await controller.get('org-1', 'mail');
    await controller.update('org-1', 'mail', {
      host: 'smtp.example.com',
    });
    await controller.test('org-1', 'mail', {});
    await controller.remove('org-1', 'mail');

    expect(listIntegrations).toHaveBeenCalledWith('org-1');
    expect(getIntegration).toHaveBeenCalledWith('org-1', 'mail');
    expect(updateIntegration).toHaveBeenCalledWith('org-1', 'mail', {
      host: 'smtp.example.com',
    });
    expect(testIntegration).toHaveBeenCalledWith('org-1', 'mail', {});
    expect(deleteIntegration).toHaveBeenCalledWith('org-1', 'mail');
  });

  it.each([null, undefined, ''])(
    'rejects a missing organization context',
    async (orgId) => {
      await expect(controller.list(orgId)).rejects.toThrow(
        ForbiddenException,
      );
    },
  );
});
