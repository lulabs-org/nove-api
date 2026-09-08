import {
  getDefaultValues,
  getRequiredFields,
  getSecretFields,
} from './definition.util';
import { IntegrationRegistry } from '../definitions';

describe('definition.util', () => {
  it('derives defaults, required fields, and secrets from one field map', () => {
    expect(getDefaultValues(IntegrationRegistry.mail)).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      brandName: 'Nove System',
      brandPrimaryColor: '#2563eb',
      brandFooterText: '此邮件由 Nove System 自动发送，请勿回复。',
    });
    expect(getRequiredFields(IntegrationRegistry.mail)).toEqual([
      'host',
      'port',
      'user',
      'pass',
      'from',
    ]);
    expect(
      Object.fromEntries(
        Object.entries(IntegrationRegistry).map(([module, entry]) => [
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
