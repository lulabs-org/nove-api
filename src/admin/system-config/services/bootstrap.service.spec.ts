import { decrypt, encrypt } from '@/common/utils/crypto.util';
import { PrismaService } from '@/prisma/prisma.service';
import { BootstrapService } from './bootstrap.service';
import {
  SYSTEM_CONFIG_ENV_IMPORT_KEY,
  SystemConfigEnvironmentImportMetadata,
} from '../registries/system-config.registry';

interface UpsertArgs {
  where: { orgId_key: { orgId: string; key: string } };
  update: { value: Record<string, unknown> };
  create: { orgId: string; key: string; value: Record<string, unknown> };
}

interface CreateArgs {
  data: { orgId: string; key: string; value: Record<string, unknown> };
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
  const orgId = 'org-1';
  const originalEnv = process.env;
  let records: Record<string, { value: Record<string, unknown> }>;
  let prisma: PrismaService;
  let service: BootstrapService;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
    for (const key of SERVICE_ENVIRONMENT_KEYS) delete process.env[key];
    records = {};

    const systemConfig = {
      findUnique: jest.fn(
        ({ where }: { where: { orgId_key: { orgId: string; key: string } } }) =>
          Promise.resolve(
            records[`${where.orgId_key.orgId}:${where.orgId_key.key}`] ?? null,
          ),
      ),
      upsert: jest.fn(({ where, update, create }: UpsertArgs) => {
        const storageKey = `${where.orgId_key.orgId}:${where.orgId_key.key}`;
        records[storageKey] = records[storageKey]
          ? { value: update.value }
          : { value: create.value };
        return Promise.resolve(records[storageKey]);
      }),
      create: jest.fn(({ data }: CreateArgs) => {
        const storageKey = `${data.orgId}:${data.key}`;
        records[storageKey] = { value: data.value };
        return Promise.resolve(records[storageKey]);
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
    records[`${orgId}:MAIL_CONFIG`] = {
      value: { host: 'db.smtp.example.com' },
    };
    process.env.SMTP_HOST = 'ignored.smtp.example.com';
    process.env.SMTP_USER = 'mail@example.com';
    process.env.SMTP_PASS = 'mail-secret';

    await service.run(orgId);

    expect(records[`${orgId}:MAIL_CONFIG`].value).toMatchObject({
      host: 'db.smtp.example.com',
      user: 'mail@example.com',
      from: 'mail@example.com',
    });
    expect(decrypt(String(records[`${orgId}:MAIL_CONFIG`].value.pass))).toBe(
      'mail-secret',
    );
    expect(records[`${orgId}:${SYSTEM_CONFIG_ENV_IMPORT_KEY}`]).toBeDefined();
    const metadata = records[`${orgId}:${SYSTEM_CONFIG_ENV_IMPORT_KEY}`]
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
    await service.run(orgId);
    expect(records[`${orgId}:MAIL_CONFIG`].value.user).toBe('mail@example.com');
  });

  it('keeps partial environment configuration for completion in admin', async () => {
    process.env.TENCENT_MEETING_APP_ID = 'partial-app';

    await service.run(orgId);

    expect(records[`${orgId}:TENCENT-MEETING_CONFIG`].value).toEqual({
      appId: 'partial-app',
    });
    expect(
      records[`${orgId}:${SYSTEM_CONFIG_ENV_IMPORT_KEY}`].value,
    ).toMatchObject({
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
    records[`${orgId}:TENCENT-MEETING_CONFIG`] = {
      value: {
        appId: 'db-app',
        secretId: 'legacy-secret-id',
        secretKey: encrypt('existing-key'),
      },
    };

    await service.run(orgId);

    expect(
      decrypt(
        String(records[`${orgId}:TENCENT-MEETING_CONFIG`].value.secretId),
      ),
    ).toBe('legacy-secret-id');
    expect(
      decrypt(
        String(records[`${orgId}:TENCENT-MEETING_CONFIG`].value.secretKey),
      ),
    ).toBe('existing-key');
  });

  it('fails startup when an imported secret cannot be encrypted', async () => {
    delete process.env.SYSTEM_ENCRYPTION_KEY;
    process.env.WECHAT_SHOP_APP_SECRET = 'secret';

    await expect(service.run(orgId)).rejects.toThrow(
      'SYSTEM_ENCRYPTION_KEY is not configured',
    );
    expect(records[`${orgId}:${SYSTEM_CONFIG_ENV_IMPORT_KEY}`]).toBeUndefined();
  });

  it('keeps import markers organization-scoped and does not restore deleted config', async () => {
    process.env.SMTP_USER = 'org-one@example.com';
    process.env.SMTP_PASS = 'org-one-secret';
    await service.run('org-1');

    delete records['org-1:MAIL_CONFIG'];
    process.env.SMTP_USER = 'changed@example.com';
    await service.run('org-1');
    expect(records['org-1:MAIL_CONFIG']).toBeUndefined();

    await service.run('org-2');
    expect(records['org-2:MAIL_CONFIG'].value.user).toBe('changed@example.com');
    expect(records[`org-2:${SYSTEM_CONFIG_ENV_IMPORT_KEY}`]).toBeDefined();
  });
});
