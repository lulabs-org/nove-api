import { decrypt, encrypt } from '@/common/utils/crypto.util';
import { SystemConfigRegistry } from '../configs';
import { ConfigCodecService } from './config-codec.service';

describe('ConfigCodecService', () => {
  const originalEnv = process.env;
  let codec: ConfigCodecService;

  beforeEach(() => {
    process.env = { ...originalEnv, SYSTEM_ENCRYPTION_KEY: 'test-key' };
    codec = new ConfigCodecService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts only declared secrets and preserves masked or blank values', () => {
    const entry = SystemConfigRegistry['wechat-shop'];
    const existingSecret = encrypt('existing-secret');

    const updated = codec.encodeUpdate(
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
    const entry = SystemConfigRegistry['tencent-meeting'];
    const unreadable = jest.fn();
    const decoded = codec.decode(
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
    expect(codec.mask(entry, decoded)).toEqual({
      appId: 'app-id',
      secretId: '********',
    });
  });
});
