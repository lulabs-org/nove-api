import { randomInt, createHash } from 'node:crypto';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;
const ORDER_CODE_RANDOM_SUFFIX_MAX = 1_000_000;

/**
 * 生成内部订单号：时间戳 + 随机后缀，避免依赖数据库序列。
 */
export function generateOrderCode(): string {
  const timestamp = Date.now().toString();
  const randomSuffix = randomInt(ORDER_CODE_RANDOM_SUFFIX_MAX)
    .toString()
    .padStart(6, '0');

  return `${timestamp}${randomSuffix}`;
}

/**
 * 对外展示订单号由内部订单号编码得到，避免直接暴露连续数字。
 */
export function encodeOrderNumber(orderCode: string): string {
  try {
    const encoded = BigInt(orderCode) ^ ORDER_NUMBER_MASK;

    return encoded.toString(36).toUpperCase();
  } catch {
    // Fallback: stable hash-based encoding when orderCode is not a valid integer
    const hash = createHash('sha256').update(String(orderCode)).digest('hex');
    // take a prefix of the hex hash and convert to BigInt for base36 encoding
    const prefix = hash.slice(0, 12); // 12 hex chars -> up to 48 bits
    const safeBigInt = BigInt('0x' + prefix);

    return safeBigInt.toString(36).toUpperCase();
  }
}
