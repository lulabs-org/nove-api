import { EventEmitter2 } from '@nestjs/event-emitter';
import { encrypt } from '@/common/utils/crypto.util';
import { IntegrationsRepository } from '../repositories/integrations.repository';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  const orgId = 'org-1';
  const originalEnv = process.env;
  let records: Record<
    string,
    { value: Record<string, unknown>; updatedAt: Date }
  >;
  let repository: jest.Mocked<IntegrationsRepository>;
  let emitter: jest.Mocked<EventEmitter2>;
  let emit: jest.Mock;
  let service: IntegrationsService;

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
    } as unknown as jest.Mocked<IntegrationsRepository>;
    emit = jest.fn();
    emitter = { emit } as unknown as jest.Mocked<EventEmitter2>;
    service = new IntegrationsService(repository, emitter);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses database values over defaults and masks secrets', async () => {
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
    await expect(service.getIntegration(orgId, 'mail')).resolves.toMatchObject({
      orgId,
      value: { pass: '********' },
    });
  });

  it('preserves a masked secret and reports a Lark credential restart', async () => {
    const result = await service.updateIntegration(orgId, 'lark', {
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

    await service.updateIntegration(orgId, 'lark', { appSecret: '********' });
    await expect(
      service.getEffectiveConfig(orgId, 'lark'),
    ).resolves.toMatchObject({
      value: { appSecret: 'new-secret' },
    });
  });

  it('deletes database config and falls back to default values', async () => {
    records[`${orgId}:AI_CONFIG`] = {
      value: { apiKey: encrypt('db-key'), model: 'db-model' },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(service.deleteIntegration(orgId, 'ai')).resolves.toMatchObject(
      {
        success: true,
        restartRequired: false,
      },
    );
    expect(emit).toHaveBeenCalledWith('config.ai.deleted', {
      orgId,
      value: {
        maxTokens: 16000,
        temperature: 0.7,
      },
    });
    const fallback = await service.getEffectiveConfig(orgId, 'ai');
    expect(fallback.configured).toBe(false);
    expect(fallback.source).toBe('default');
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

  it('returns effective config and masks Tencent Secret ID', async () => {
    records[`${orgId}:TENCENT-MEETING_CONFIG`] = {
      value: {
        appId: 'app-id',
        secretId: encrypt('secret-id'),
        secretKey: encrypt('secret-key'),
      },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(
      service.getIntegration(orgId, 'tencent-meeting'),
    ).resolves.toMatchObject({
      orgId,
      source: 'database',
      value: { secretId: '********', secretKey: '********' },
    });
  });

  it('isolates configurations with the same key by organization', async () => {
    await service.updateIntegration('org-1', 'mail', {
      host: 'smtp.one.example.com',
    });
    await service.updateIntegration('org-2', 'mail', {
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

    await service.deleteIntegration('org-1', 'mail');
    await expect(
      service.getEffectiveConfig('org-2', 'mail'),
    ).resolves.toMatchObject({
      source: 'database',
      value: { host: 'smtp.two.example.com' },
    });
  });
});
