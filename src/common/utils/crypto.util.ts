import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Ensure the key is exactly 32 bytes for aes-256-gcm
  const key = Buffer.from(keyStr, 'utf-8');
  if (key.length !== 32) {
    // If the key length is not 32 bytes, we can hash it to get exactly 32 bytes
    return crypto.createHash('sha256').update(key).digest();
  }
  return key;
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 12 bytes IV is standard for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed');
  }
}

export function encryptConfig(config: Record<string, any>, sensitiveKeys: string[]): Record<string, any> {
  if (!config) return config;
  
  const encryptedConfig = { ...config };
  for (const key of sensitiveKeys) {
    if (encryptedConfig[key] && typeof encryptedConfig[key] === 'string' && encryptedConfig[key] !== '******') {
      encryptedConfig[key] = encrypt(encryptedConfig[key]);
    }
  }
  return encryptedConfig;
}

export function decryptConfig(config: Record<string, any>, sensitiveKeys: string[]): Record<string, any> {
  if (!config) return config;
  
  const decryptedConfig = { ...config };
  for (const key of sensitiveKeys) {
    if (decryptedConfig[key] && typeof decryptedConfig[key] === 'string') {
      try {
        decryptedConfig[key] = decrypt(decryptedConfig[key]);
      } catch (err) {
        // Fallback or leave as is if it's not encrypted properly
      }
    }
  }
  return decryptedConfig;
}

export function maskConfig(config: Record<string, any>, sensitiveKeys: string[]): Record<string, any> {
  if (!config) return config;
  
  const maskedConfig = { ...config };
  for (const key of sensitiveKeys) {
    if (maskedConfig[key]) {
      maskedConfig[key] = '******';
    }
  }
  return maskedConfig;
}
