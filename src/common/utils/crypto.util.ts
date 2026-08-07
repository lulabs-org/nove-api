import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string, encryptionKey?: string): string {
  const keyToUse = encryptionKey || process.env.SYSTEM_ENCRYPTION_KEY;
  if (!keyToUse) {
    throw new Error('SYSTEM_ENCRYPTION_KEY is not configured');
  }
  
  // Hash the key to ensure it's exactly 32 bytes for aes-256-gcm
  const key = crypto.createHash('sha256').update(keyToUse).digest();
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string, encryptionKey?: string): string {
  const keyToUse = encryptionKey || process.env.SYSTEM_ENCRYPTION_KEY;
  if (!keyToUse) {
    throw new Error('SYSTEM_ENCRYPTION_KEY is not configured');
  }

  const key = crypto.createHash('sha256').update(keyToUse).digest();
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const [ivHex, authTagHex, encryptedDataHex] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
