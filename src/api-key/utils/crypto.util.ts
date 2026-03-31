/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 14:56:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-23 19:53:14
 * @FilePath: /nove_api/src/api-key/utils/crypto.util.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * 生成随机 base64url 字符串（length = 随机字节数）
 * - 输出使用 RFC 4648 base64url（'-','_'，无 '=' padding）
 */
export function randomBase64Url(length: number): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError('length must be a positive integer');
  }

  // Node 原生支持 base64url：无需 replace
  return randomBytes(length).toString('base64url');
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
 * @param rawKey 原始 API Key (格式: sk_<prefix>.<secret>)
 * @returns 解析后的 prefix 和 secret，如果格式无效则返回 null
 */
export function parseApiKey(rawKey: string): {
  prefix: string;
  secret: string;
} | null {
  const match = rawKey.match(/^sk_([^.]+)\.(.+)$/);

  if (!match) {
    return null;
  }

  const [, prefix, secret] = match;
  return { prefix, secret };
}

/**
 * 生成完整的 API Key
 * @param secret 服务器密钥
 * @returns 包含原始 key、prefix、secret、hash 和 last4 的对象
 */
export function generateApiKey(secret: string): {
  rawKey: string;
  prefix: string;
  secret: string;
  keyHash: string;
  last4: string;
} {
  // 生成10字节长度的随机前缀
  const prefix = randomBase64Url(10).substring(0, 10);
  // 生成30字节长度的随机密钥
  const keySecret = randomBase64Url(30);
  // 组合前缀和密钥生成完整的API Key
  const rawKey = `sk_${prefix}.${keySecret}`;
  // 计算API Key的哈希值用于存储
  const keyHash = computeKeyHash(rawKey, secret);
  // 获取密钥最后4位用于显示
  const last4 = keySecret.slice(-4);

  return {
    rawKey,
    prefix,
    secret: keySecret,
    keyHash,
    last4,
  };
}
