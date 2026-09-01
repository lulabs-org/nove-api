import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * 使用 AES-256-GCM 算法对明文字符串进行对称加密
 * 
 * 默认使用环境变量 `SYSTEM_ENCRYPTION_KEY` 作为加密密钥。
 * GCM 模式不仅能加密数据，还能提供认证（Authentication），防止密文被篡改。
 * 
 * @param text 需要加密的明文字符串
 * @param encryptionKey 可选的自定义密钥。如果不传，则使用环境变量中的全局密钥
 * @returns 格式化后的密文字符串：`iv:authTag:encryptedText`
 */
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

/**
 * 对 `encrypt` 函数生成的密文进行解密
 * 
 * 会自动从密文字符串中提取 IV（初始化向量）和 Auth Tag（认证标签）以验证数据完整性。
 * 
 * @param encryptedText 符合 `iv:authTag:encryptedText` 格式的密文
 * @param encryptionKey 可选的自定义密钥。必须与加密时使用的密钥完全一致
 * @returns 解密还原出的明文字符串
 * @throws 当密文格式不正确、密钥不匹配或数据被篡改时，抛出 Error
 */
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
