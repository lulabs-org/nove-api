import { EventEmitter2 } from '@nestjs/event-emitter';
import { encrypt } from '@/common/utils/crypto.util';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { SystemConfigService } from './system-config.service';
import { ConfigCodecService } from './config-codec.service';

describe('SystemConfigService', () => {
  const orgId = 'org-1';
  const originalEnv = process.env;
  let records: Record<
    string,
    { value: Record<string, unknown>; updatedAt: Date }
  >;
  let repository: jest.Mocked<SystemConfigRepository>;
  let emitter: jest.Mocked<EventEmitter2>;
  let emit: jest.Mock;
  let service: SystemConfigService;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
    records = {};
    repository = {
      findByKey: jest.fn((requestedOrgId: string, key: string) => {
        const record = records[`${requestedOrgId}:${key}`];
        return Promise.resolve(
          record ? ({ orgId: requestedOrgId, key, ...record } as never) : null,
        );
      }),
      upsert: jest.fn((requestedOrgId: string, key: string, value: unknown) => {
        records[`${requestedOrgId}:${key}`] = {
          value: value as Record<string, unknown>,
          updatedAt: new Date('2026-09-01T00:00:00Z'),
        };
        return Promise.resolve({
          orgId: requestedOrgId,
          key,
          ...records[`${requestedOrgId}:${key}`],
        } as never);
      }),
      delete: jest.fn((requestedOrgId: string, key: string) => {
        const record = records[`${requestedOrgId}:${key}`];
        delete records[`${requestedOrgId}:${key}`];
        return Promise.resolve(
          record ? ({ orgId: requestedOrgId, key, ...record } as never) : null,
        );
      }),
    } as unknown as jest.Mocked<SystemConfigRepository>;
    emit = jest.fn();
    emitter = { emit } as unknown as jest.Mocked<EventEmitter2>;
    service = new SystemConfigService(
      repository,
      emitter,
      new ConfigCodecService(),
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses database values, ignores environment values, and masks secrets', async () => {
    process.env.SMTP_USER = 'env@example.com';
    process.env.SMTP_PASS = 'env-password';
    process.env.SMTP_FROM = 'env@example.com';
    records[`${orgId}:MAIL_CONFIG`] = {
      value: {
        host: 'db.smtp.example.com',
        user: 'db@example.com',
        pass: encrypt('db-password'),
        from: 'db@example.com',
      },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(
      service.getEffectiveConfig(orgId, 'mail'),
    ).resolves.toMatchObject({
      orgId,
      configured: true,
      source: 'database',
      value: {
        host: 'db.smtp.example.com',
        user: 'db@example.com',
        pass: 'db-password',
      },
    });
    await expect(service.getConfig(orgId, 'mail')).resolves.toMatchObject({
      orgId,
      value: { pass: '********' },
    });
  });

  it('preserves a masked secret and reports a Lark credential restart', async () => {
    process.env.LARK_APP_ID = 'old-app';
    process.env.LARK_APP_SECRET = 'old-secret';

    const result = await service.updateConfig(orgId, 'lark', {
      appId: 'new-app',
      appSecret: 'new-secret',
    });

    expect(result.restartRequired).toBe(true);
    expect(records[`${orgId}:LARK_CONFIG`].value.appSecret).not.toBe(
      'new-secret',
    );
    const emittedEvents = emit.mock.calls as unknown as Array<
      [string, { orgId: string; value: Record<string, unknown> }]
    >;
    const emittedEvent = emittedEvents.find(
      ([eventName]) => eventName === 'config.lark.updated',
    );
    expect(emittedEvent?.[1]).toMatchObject({
      orgId,
      value: { appId: 'new-app', appSecret: 'new-secret' },
    });

    await service.updateConfig(orgId, 'lark', { appSecret: '********' });
    await expect(
      service.getEffectiveConfig(orgId, 'lark'),
    ).resolves.toMatchObject({
      value: { appSecret: 'new-secret' },
    });
  });

  it('deletes database config without restoring environment values', async () => {
    delete process.env.ARK_API_KEY;
    process.env.OPENAI_API_KEY = 'env-key';
    records[`${orgId}:AI_CONFIG`] = {
      value: { apiKey: encrypt('db-key'), model: 'db-model' },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(service.deleteConfig(orgId, 'ai')).resolves.toMatchObject({
      success: true,
      restartRequired: false,
    });
    expect(emit).toHaveBeenCalledWith('config.ai.deleted', {
      orgId,
      value: {
        provider: 'openai',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        model: '{TEMPLATE_ENDPOINT_ID}',
        maxTokens: 16000,
        temperature: 0.7,
      },
    });
  });

  it('uses the effective secret when testing a masked draft', async () => {
    records[`${orgId}:WECHAT-SHOP_CONFIG`] = {
      value: { appId: 'db-app', appSecret: encrypt('db-secret') },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(
      service.resolveDraftConfig(orgId, 'wechat-shop', {
        appId: 'draft-app',
        appSecret: '********',
      }),
    ).resolves.toMatchObject({
      value: { appId: 'draft-app', appSecret: 'db-secret' },
    });
  });

  it('returns safe import metadata and masks Tencent Secret ID', async () => {
    records[`${orgId}:TENCENT-MEETING_CONFIG`] = {
      value: {
        appId: 'app-id',
        secretId: encrypt('secret-id'),
        secretKey: encrypt('secret-key'),
      },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };
    records[`${orgId}:SYSTEM_CONFIG_ENV_IMPORT_V1`] = {
      value: {
        version: 1,
        completedAt: '2026-09-01T01:00:00.000Z',
        modules: {
          'tencent-meeting': {
            status: 'imported',
            fields: ['appId', 'secretId'],
            configured: false,
          },
        },
      },
      updatedAt: new Date('2026-09-01T01:00:00Z'),
    };

    await expect(
      service.getConfig(orgId, 'tencent-meeting'),
    ).resolves.toMatchObject({
      orgId,
      source: 'database',
      environmentImportedAt: '2026-09-01T01:00:00.000Z',
      environmentImportedFields: ['appId', 'secretId'],
      value: { secretId: '********', secretKey: '********' },
    });
  });

  it('isolates configurations with the same key by organization', async () => {
    await service.updateConfig('org-1', 'mail', {
      host: 'smtp.one.example.com',
    });
    await service.updateConfig('org-2', 'mail', {
      host: 'smtp.two.example.com',
    });

    await expect(
      service.getEffectiveConfig('org-1', 'mail'),
    ).resolves.toMatchObject({
      orgId: 'org-1',
      value: { host: 'smtp.one.example.com' },
    });
    await expect(
      service.getEffectiveConfig('org-2', 'mail'),
    ).resolves.toMatchObject({
      orgId: 'org-2',
      value: { host: 'smtp.two.example.com' },
    });

    await service.deleteConfig('org-1', 'mail');
    await expect(
      service.getEffectiveConfig('org-2', 'mail'),
    ).resolves.toMatchObject({
      source: 'database',
      value: { host: 'smtp.two.example.com' },
    });
  });
});
