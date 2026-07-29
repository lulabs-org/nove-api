import { randomInt, createHash } from 'node:crypto';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;

let sequence = 0;
let lastTimestamp = 0;

// 使用环境变量中的 WORKER_ID，如果未提供则使用进程 PID，截取最后 2 位以确保多实例不冲突
const WORKER_ID = process.env.WORKER_ID
  ? process.env.WORKER_ID.padStart(2, '0').slice(-2)
  : (process.pid % 100).toString().padStart(2, '0');

/**
 * 生成内部订单号：时间戳 + Worker ID + 序列号，解决高并发下的重复问题。
 */
export function generateOrderCode(): string {
  let timestamp = Date.now();

  if (timestamp === lastTimestamp) {
    // 同一毫秒内序列号自增，最大 9999
    sequence = (sequence + 1) % 10000;
    if (sequence === 0) {
      // 如果一毫秒内并发超过 10000，等待下一毫秒
      while (timestamp <= lastTimestamp) {
        timestamp = Date.now();
      }
    }
  } else {
    // 不同毫秒，序列号从一个随机数开始，避免每次都是0
    sequence = randomInt(100);
  }
  lastTimestamp = timestamp;

  const sequenceStr = sequence.toString().padStart(4, '0');

  // 时间戳(13位) + WorkerID(2位) + 序列号(4位) = 19位
  return `${timestamp}${WORKER_ID}${sequenceStr}`;
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
