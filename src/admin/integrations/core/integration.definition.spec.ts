import {
  getDefaultValues,
  getRequiredFields,
  getSecretFields,
} from './system-config.definition';
import { SystemConfigRegistry } from '../definitions';

describe('system config definitions', () => {
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
      ],
      'wechat-shop': ['appSecret', 'webhookToken', 'encodingAesKey'],
    });
  });
});
