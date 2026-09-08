import { decrypt, encrypt } from '@/common/utils/crypto.util';
import { IntegrationRegistry } from '../definitions';
import {
  decodeConfig,
  encodeUpdateConfig,
  maskConfig,
} from './codec.util';

describe('codec.util', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts only declared secrets and preserves masked or blank values', () => {
    const entry = IntegrationRegistry['wechat-shop'];
    const existingSecret = encrypt('existing-secret');

    const updated = encodeUpdateConfig(
      entry,
      { appId: 'old-app', appSecret: existingSecret },
      {
        appId: 'new-app',
        appSecret: '********',
        webhookToken: 'new-token',
        encodingAesKey: '',
      },
    );

    expect(updated).toMatchObject({
      appId: 'new-app',
      appSecret: existingSecret,
    });
    expect(decrypt(String(updated.webhookToken))).toBe('new-token');
    expect(updated.encodingAesKey).toBeUndefined();
  });

  it('decodes runtime values, masks public secrets, and ignores unreadable data', () => {
    const entry = IntegrationRegistry['tencent-meeting'];
    const unreadable = jest.fn();
    const decoded = decodeConfig(
      entry,
      {
        appId: 'app-id',
        secretId: encrypt('secret-id'),
        secretKey: 'not-encrypted',
      },
      unreadable,
    );

    expect(decoded).toEqual({ appId: 'app-id', secretId: 'secret-id' });
    expect(unreadable).toHaveBeenCalledWith('secretKey');
    expect(maskConfig(entry, decoded)).toEqual({
      appId: 'app-id',
      secretId: '********',
    });
  });
});
