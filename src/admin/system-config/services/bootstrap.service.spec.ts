import { decrypt, encrypt } from '@/common/utils/crypto.util';
import { PrismaService } from '@/prisma/prisma.service';
import { BootstrapService } from './bootstrap.service';
import {
  SYSTEM_CONFIG_ENV_IMPORT_KEY,
  SystemConfigEnvironmentImportMetadata,
} from '../registries/system-config.registry';

interface UpsertArgs {
  where: { key: string };
  update: { value: Record<string, unknown> };
  create: { value: Record<string, unknown> };
}

interface CreateArgs {
  data: { key: string; value: Record<string, unknown> };
}

const SERVICE_ENVIRONMENT_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'EMAIL_BRAND_NAME',
  'EMAIL_BRAND_LOGO_URL',
  'EMAIL_BRAND_PRIMARY_COLOR',
  'EMAIL_BRAND_FOOTER_TEXT',
  'EMAIL_BRAND_PUBLIC_BASE_URL',
  'ARK_API_KEY',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'OPENAI_MAX_TOKENS',
  'OPENAI_TEMPERATURE',
  'TENCENT_MEETING_APP_ID',
  'TENCENT_MEETING_SDK_ID',
  'TENCENT_MEETING_SECRET_ID',
  'TENCENT_MEETING_SECRET_KEY',
  'TENCENT_MEETING_TOKEN',
  'TENCENT_MEETING_ENCODING_AES_KEY',
  'USER_ID',
  'LARK_APP_ID',
  'LARK_APP_SECRET',
  'LARK_EVENT_ENCRYPT_KEY',
  'LARK_EVENT_VERIFICATION_TOKEN',
  'LARK_BITABLE_APP_TOKEN',
  'LARK_TABLE_MEETING_RECORD',
  'LARK_TABLE_MEETING_USER',
  'LARK_TABLE_MEETING_RECORDING',
  'LARK_TABLE_PERSONAL_MEETING_SUMMARY',
  'WECHAT_SHOP_APP_ID',
  'WECHAT_SHOP_APP_SECRET',
  'WECHAT_SHOP_WEBHOOK_TOKEN',
  'WECHAT_SHOP_ENCODING_AES_KEY',
  'WECHAT_SHOP_API_BASE_URL',
  'WECHAT_API_BASE_URL',
] as const;

describe('BootstrapService', () => {
  const originalEnv = process.env;
  let records: Record<string, { value: Record<string, unknown> }>;
  let prisma: PrismaService;
  let service: BootstrapService;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
    for (const key of SERVICE_ENVIRONMENT_KEYS) delete process.env[key];
    records = {};

    const systemConfig = {
      findUnique: jest.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(records[where.key] ?? null),
      ),
      upsert: jest.fn(({ where, update, create }: UpsertArgs) => {
        records[where.key] = records[where.key]
          ? { value: update.value }
          : { value: create.value };
        return Promise.resolve(records[where.key]);
      }),
      create: jest.fn(({ data }: CreateArgs) => {
        records[data.key] = { value: data.value };
        return Promise.resolve(records[data.key]);
      }),
    };
    prisma = {
      systemConfig,
      $transaction: jest.fn((callback: (client: unknown) => unknown) =>
        callback({ systemConfig }),
      ),
    } as unknown as PrismaService;
    service = new BootstrapService(prisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('imports environment fields once, preserves database fields, and encrypts secrets', async () => {
    records.MAIL_CONFIG = { value: { host: 'db.smtp.example.com' } };
    process.env.SMTP_HOST = 'ignored.smtp.example.com';
    process.env.SMTP_USER = 'mail@example.com';
    process.env.SMTP_PASS = 'mail-secret';

    await service.run();

    expect(records.MAIL_CONFIG.value).toMatchObject({
      host: 'db.smtp.example.com',
      user: 'mail@example.com',
      from: 'mail@example.com',
    });
    expect(decrypt(String(records.MAIL_CONFIG.value.pass))).toBe('mail-secret');
    expect(records[SYSTEM_CONFIG_ENV_IMPORT_KEY]).toBeDefined();
    const metadata = records[SYSTEM_CONFIG_ENV_IMPORT_KEY]
      .value as unknown as SystemConfigEnvironmentImportMetadata;
    expect(metadata.version).toBe(1);
    expect(metadata.modules.mail).toMatchObject({
      status: 'imported',
      configured: true,
    });
    expect(metadata.modules.mail.fields).toEqual(
      expect.arrayContaining(['user', 'pass', 'from']),
    );

    process.env.SMTP_USER = 'changed@example.com';
    await service.run();
    expect(records.MAIL_CONFIG.value.user).toBe('mail@example.com');
  });

  it('keeps partial environment configuration for completion in admin', async () => {
    process.env.TENCENT_MEETING_APP_ID = 'partial-app';

    await service.run();

    expect(records['TENCENT-MEETING_CONFIG'].value).toEqual({
      appId: 'partial-app',
    });
    expect(records[SYSTEM_CONFIG_ENV_IMPORT_KEY].value).toMatchObject({
      modules: {
        'tencent-meeting': {
          status: 'imported',
          fields: ['appId'],
          configured: false,
        },
      },
    });
  });

  it('upgrades a legacy plaintext Tencent Secret ID without replacing other fields', async () => {
    records['TENCENT-MEETING_CONFIG'] = {
      value: {
        appId: 'db-app',
        secretId: 'legacy-secret-id',
        secretKey: encrypt('existing-key'),
      },
    };

    await service.run();

    expect(
      decrypt(String(records['TENCENT-MEETING_CONFIG'].value.secretId)),
    ).toBe('legacy-secret-id');
    expect(
      decrypt(String(records['TENCENT-MEETING_CONFIG'].value.secretKey)),
    ).toBe('existing-key');
  });

  it('fails startup when an imported secret cannot be encrypted', async () => {
    delete process.env.SYSTEM_ENCRYPTION_KEY;
    process.env.WECHAT_SHOP_APP_SECRET = 'secret';

    await expect(service.run()).rejects.toThrow(
      'SYSTEM_ENCRYPTION_KEY is not configured',
    );
    expect(records[SYSTEM_CONFIG_ENV_IMPORT_KEY]).toBeUndefined();
  });
});
