import {
  getDefaultValues,
  getRequiredFields,
  getSecretFields,
  readBootstrapEnvironment,
} from './system-config.definition';
import { SystemConfigRegistry } from '../registries/system-config.registry';

describe('system config definitions', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('derives defaults, required fields, and secrets from one field map', () => {
    expect(getDefaultValues(SystemConfigRegistry.mail)).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      brandName: 'Nove System',
      brandPrimaryColor: '#2563eb',
      brandFooterText: '此邮件由 Nove System 自动发送，请勿回复。',
    });
    expect(getRequiredFields(SystemConfigRegistry.mail)).toEqual([
      'host',
      'port',
      'user',
      'pass',
      'from',
    ]);
    expect(
      Object.fromEntries(
        Object.entries(SystemConfigRegistry).map(([module, entry]) => [
          module,
          getSecretFields(entry),
        ]),
      ),
    ).toEqual({
      mail: ['pass'],
      ai: ['apiKey'],
      'tencent-meeting': [
        'secretId',
        'secretKey',
        'webhookToken',
        'encodingAesKey',
      ],
      lark: [
        'appSecret',
        'eventEncryptKey',
        'eventVerificationToken',
        'bitableAppToken',
      ],
      'wechat-shop': ['appSecret', 'webhookToken', 'encodingAesKey'],
    });
  });

  it('reads and derives environment values without duplicating field lists', () => {
    process.env = {
      EMAIL_BRAND_NAME: 'Acme',
      SMTP_USER: 'mail@example.com',
      SMTP_PASS: 'mail-secret',
      ARK_API_KEY: 'ark-secret',
      OPENAI_API_KEY: 'ignored-openai-secret',
    };

    expect(readBootstrapEnvironment(SystemConfigRegistry.mail)).toEqual({
      values: {
        user: 'mail@example.com',
        pass: 'mail-secret',
        from: 'mail@example.com',
        brandName: 'Acme',
        brandFooterText: '此邮件由 Acme 自动发送，请勿回复。',
      },
      fields: ['user', 'pass', 'from', 'brandName'],
    });
    expect(readBootstrapEnvironment(SystemConfigRegistry.ai)).toMatchObject({
      values: { provider: 'ark', apiKey: 'ark-secret' },
      fields: ['provider', 'apiKey'],
    });
  });
});
