import { ForbiddenException } from '@nestjs/common';
import { SystemConfigService, TesterService } from '../services';
import { SystemConfigController } from './system-config.controller';

describe('SystemConfigController', () => {
  const listConfigs = jest.fn();
  const getConfig = jest.fn();
  const updateConfig = jest.fn();
  const deleteConfig = jest.fn();
  const testConfig = jest.fn();
  const systemConfigService = {
    listConfigs,
    getConfig,
    updateConfig,
    deleteConfig,
  } as unknown as jest.Mocked<SystemConfigService>;
  const testerService = {
    testConfig,
  } as unknown as jest.Mocked<TesterService>;
  const controller = new SystemConfigController(
    systemConfigService,
    testerService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated organization to every operation', async () => {
    await controller.listConfigs('org-1');
    await controller.getConfig('org-1', 'mail');
    await controller.updateConfig('org-1', 'mail', {
      host: 'smtp.example.com',
    });
    await controller.testConfig('org-1', 'mail', {});
    await controller.deleteConfig('org-1', 'mail');

    expect(listConfigs).toHaveBeenCalledWith('org-1');
    expect(getConfig).toHaveBeenCalledWith('org-1', 'mail');
    expect(updateConfig).toHaveBeenCalledWith('org-1', 'mail', {
      host: 'smtp.example.com',
    });
    expect(testConfig).toHaveBeenCalledWith('org-1', 'mail', {});
    expect(deleteConfig).toHaveBeenCalledWith('org-1', 'mail');
  });

  it.each([null, undefined, ''])(
    'rejects a missing organization context',
    async (orgId) => {
      await expect(controller.listConfigs(orgId)).rejects.toThrow(
        ForbiddenException,
      );
    },
  );
});
