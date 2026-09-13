import { Injectable, OnModuleInit } from '@nestjs/common';
import { decrypt, encrypt } from '@/common/utils/crypto.util';

export type SecurityContactSnapshot =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; countryCode: string; phone: string };

@Injectable()
export class SecurityAuditCryptoService implements OnModuleInit {
  private readonly key = process.env.SYSTEM_ENCRYPTION_KEY ?? '';
  readonly keyVersion = process.env.SYSTEM_ENCRYPTION_KEY_VERSION ?? 'v1';

  onModuleInit(): void {
    if (Buffer.byteLength(this.key, 'utf8') < 32) {
      throw new Error(
        'SYSTEM_ENCRYPTION_KEY must be configured with at least 32 bytes',
      );
    }
  }

  encryptSnapshot(snapshot: SecurityContactSnapshot): string {
    this.onModuleInit();
    return encrypt(JSON.stringify(snapshot), this.key);
  }

  decryptSnapshot(ciphertext: string): SecurityContactSnapshot {
    this.onModuleInit();
    return JSON.parse(decrypt(ciphertext, this.key)) as SecurityContactSnapshot;
  }
}
