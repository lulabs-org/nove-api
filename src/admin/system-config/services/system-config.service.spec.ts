import { EventEmitter2 } from '@nestjs/event-emitter';
import { encrypt } from '@/common/utils/crypto.util';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigService', () => {
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
      findByKey: jest.fn((key: string) => {
        const record = records[key];
        return Promise.resolve(record ? ({ key, ...record } as never) : null);
      }),
      upsert: jest.fn((key: string, value: unknown) => {
        records[key] = {
          value: value as Record<string, unknown>,
          updatedAt: new Date('2026-09-01T00:00:00Z'),
        };
        return Promise.resolve({ key, ...records[key] } as never);
      }),
      delete: jest.fn((key: string) => {
        const record = records[key];
        delete records[key];
        return Promise.resolve(record ? ({ key, ...record } as never) : null);
      }),
    } as unknown as jest.Mocked<SystemConfigRepository>;
    emit = jest.fn();
    emitter = { emit } as unknown as jest.Mocked<EventEmitter2>;
    service = new SystemConfigService(repository, emitter);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses database values, ignores environment values, and masks secrets', async () => {
    process.env.SMTP_USER = 'env@example.com';
    process.env.SMTP_PASS = 'env-password';
    process.env.SMTP_FROM = 'env@example.com';
    records.MAIL_CONFIG = {
      value: {
        host: 'db.smtp.example.com',
        user: 'db@example.com',
        pass: encrypt('db-password'),
        from: 'db@example.com',
      },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(service.getEffectiveConfig('mail')).resolves.toMatchObject({
      configured: true,
      source: 'database',
      value: {
        host: 'db.smtp.example.com',
        user: 'db@example.com',
        pass: 'db-password',
      },
    });
    await expect(service.getConfig('mail')).resolves.toMatchObject({
      value: { pass: '********' },
    });
  });

  it('preserves a masked secret and reports a Lark credential restart', async () => {
    process.env.LARK_APP_ID = 'old-app';
    process.env.LARK_APP_SECRET = 'old-secret';

    const result = await service.updateConfig('lark', {
      appId: 'new-app',
      appSecret: 'new-secret',
    });

    expect(result.restartRequired).toBe(true);
    expect(records.LARK_CONFIG.value.appSecret).not.toBe('new-secret');
    expect(emit).toHaveBeenCalledWith(
      'config.lark.updated',
      expect.objectContaining({ appId: 'new-app', appSecret: 'new-secret' }),
    );

    await service.updateConfig('lark', { appSecret: '********' });
    await expect(service.getEffectiveConfig('lark')).resolves.toMatchObject({
      value: { appSecret: 'new-secret' },
    });
  });

  it('deletes database config without restoring environment values', async () => {
    delete process.env.ARK_API_KEY;
    process.env.OPENAI_API_KEY = 'env-key';
    records.AI_CONFIG = {
      value: { apiKey: encrypt('db-key'), model: 'db-model' },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(service.deleteConfig('ai')).resolves.toMatchObject({
      success: true,
      restartRequired: false,
    });
    expect(emit).toHaveBeenCalledWith('config.ai.deleted', {
      provider: 'custom',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      model: '{TEMPLATE_ENDPOINT_ID}',
      maxTokens: 16000,
      temperature: 0.7,
    });
  });

  it('uses the effective secret when testing a masked draft', async () => {
    records['WECHAT-SHOP_CONFIG'] = {
      value: { appId: 'db-app', appSecret: encrypt('db-secret') },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };

    await expect(
      service.resolveDraftConfig('wechat-shop', {
        appId: 'draft-app',
        appSecret: '********',
      }),
    ).resolves.toMatchObject({
      value: { appId: 'draft-app', appSecret: 'db-secret' },
    });
  });

  it('returns safe import metadata and masks Tencent Secret ID', async () => {
    records['TENCENT-MEETING_CONFIG'] = {
      value: {
        appId: 'app-id',
        secretId: encrypt('secret-id'),
        secretKey: encrypt('secret-key'),
      },
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };
    records.SYSTEM_CONFIG_ENV_IMPORT_V1 = {
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

    await expect(service.getConfig('tencent-meeting')).resolves.toMatchObject({
      source: 'database',
      environmentImportedAt: '2026-09-01T01:00:00.000Z',
      environmentImportedFields: ['appId', 'secretId'],
      value: { secretId: '********', secretKey: '********' },
    });
  });
});
