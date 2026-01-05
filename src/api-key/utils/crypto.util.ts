import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * 生成随机的 base64url 编码字符串
 * @param length 字节长度
 * @returns base64url 编码的字符串
 */
export function generateRandomBase64Url(length: number): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 计算 API Key 的 HMAC-SHA256 哈希值
 * @param rawKey 原始 API Key
 * @param secret 服务器密钥
 * @returns 十六进制格式的哈希值
 */
export function computeKeyHash(rawKey: string, secret: string): string {
  return createHmac('sha256', secret).update(rawKey).digest('hex');
}

/**
 * 验证 API Key 哈希（使用常量时间比较防止时序攻击）
 * @param rawKey 原始 API Key
 * @param storedHash 存储的哈希值
 * @param secret 服务器密钥
 * @returns 是否匹配
 */
export function verifyKeyHash(
  rawKey: string,
  storedHash: string,
  secret: string,
): boolean {
  const computedHash = computeKeyHash(rawKey, secret);

  // 确保两个哈希值长度相同
  if (computedHash.length !== storedHash.length) {
    return false;
  }

  // 使用常量时间比较防止时序攻击
  return timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
}

/**
 * 解析 API Key 格式
 * @param rawKey 原始 API Key (格式: sk_<env>_<prefix>.<secret>)
 * @returns 解析后的 prefix 和 secret，如果格式无效则返回 null
 */
export function parseApiKey(rawKey: string): {
  prefix: string;
  secret: string;
} | null {
  // 匹配格式: sk_<env>_<prefix>.<secret>
  const match = rawKey.match(/^sk_\w+_([^.]+)\.(.+)$/);

  if (!match) {
    return null;
  }

  const [, prefix, secret] = match;
  return { prefix, secret };
}

/**
 * 生成完整的 API Key
 * @param env 环境标识 (dev, staging, prod)
 * @returns 包含原始 key、prefix、secret、hash 和 last4 的对象
 */
export function generateApiKey(
  env: string,
  secret: string,
): {
  rawKey: string;
  prefix: string;
  secret: string;
  keyHash: string;
  last4: string;
} {
  // 生成 prefix: 10 字节 = ~13 个 base64url 字符，取前 10 个
  const prefix = generateRandomBase64Url(10).substring(0, 10);

  // 生成 secret: 30 字节 = ~40 个 base64url 字符
  const keySecret = generateRandomBase64Url(30);

  // 组装完整的 key: sk_<env>_<prefix>.<secret>
  const rawKey = `sk_${env}_${prefix}.${keySecret}`;

  // 计算哈希
  const keyHash = computeKeyHash(rawKey, secret);

  // 获取最后 4 位用于显示
  const last4 = keySecret.slice(-4);

  return {
    rawKey,
    prefix,
    secret: keySecret,
    keyHash,
    last4,
  };
}
