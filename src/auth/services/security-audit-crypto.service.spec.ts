import { SecurityAuditCryptoService } from './security-audit-crypto.service';

describe('SecurityAuditCryptoService', () => {
  const originalKey = process.env.SYSTEM_ENCRYPTION_KEY;
  const originalVersion = process.env.SYSTEM_ENCRYPTION_KEY_VERSION;

  afterEach(() => {
    process.env.SYSTEM_ENCRYPTION_KEY = originalKey;
    process.env.SYSTEM_ENCRYPTION_KEY_VERSION = originalVersion;
  });

  it('encrypts contact snapshots without retaining plaintext', () => {
    process.env.SYSTEM_ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.SYSTEM_ENCRYPTION_KEY_VERSION = 'v2';
    const service = new SecurityAuditCryptoService();
    const snapshot = { kind: 'email' as const, email: 'old@example.com' };

    const ciphertext = service.encryptSnapshot(snapshot);

    expect(ciphertext).not.toContain(snapshot.email);
    expect(service.decryptSnapshot(ciphertext)).toEqual(snapshot);
    expect(service.keyVersion).toBe('v2');
  });

  it('rejects missing or weak encryption keys', () => {
    process.env.SYSTEM_ENCRYPTION_KEY = 'too-short';
    const service = new SecurityAuditCryptoService();

    expect(() => service.onModuleInit()).toThrow(
      'SYSTEM_ENCRYPTION_KEY must be configured with at least 32 bytes',
    );
  });
});
