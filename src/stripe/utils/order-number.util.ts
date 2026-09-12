import { randomInt } from 'node:crypto';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;

let sequence = 0;
let lastTimestamp = 0;

const WORKER_ID = process.env.WORKER_ID
  ? process.env.WORKER_ID.padStart(2, '0').slice(-2)
  : (process.pid % 100).toString().padStart(2, '0');

/**
 * 生成内部订单号：时间戳 + Worker ID + 序列号
 */
export function generateOrderCode(): string {
  let timestamp = Date.now();

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1) % 10000;
    if (sequence === 0) {
      while (timestamp <= lastTimestamp) {
        timestamp = Date.now();
      }
    }
  } else {
    sequence = randomInt(100);
  }
  lastTimestamp = timestamp;

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `${timestamp}${WORKER_ID}${sequenceStr}`;
}

/**
 * 对外展示订单号由内部订单号编码得到
 */
export function encodeOrderNumber(orderCode: string): string {
  const encoded = BigInt(orderCode) ^ ORDER_NUMBER_MASK;
  return encoded.toString(36).toUpperCase();
}
