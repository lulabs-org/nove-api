import { createDecipheriv, createHash, timingSafeEqual } from 'node:crypto';

/**
 * 微信签名生成工具
 *
 * 将传入的字符串数组按字典序排序后，拼接成一个字符串，
 * 然后进行 SHA1 加密，返回加密后的十六进制字符串。
 *
 * @param args 参与签名的参数（如 token, timestamp, nonce, encrypt 等）
 * @returns SHA1 签名字符串
 */
export function generateSignature(...args: string[]): string {
  const str = [...args].sort().join('');
  return createHash('sha1').update(str).digest('hex');
}

/**
 * 使用常量时间比较签名，避免普通字符串比较泄露匹配进度。
 */
export function isSignatureEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

/**
 * 微信消息解密工具
 *
 * @param encrypt 微信推送的加密消息体 (Base64)
 * @param encodingAesKey 开发者配置的 EncodingAESKey
 * @param appId 微信小店/小程序的 AppID
 * @returns 解密并解析后的 JSON 对象
 */
export function decryptWechatMessage(
  encrypt: string,
  encodingAesKey: string,
  appId: string,
): Record<string, unknown> {
  // 1. AESKey = Base64_Decode( EncodingAESKey + "=" )
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');

  if (aesKey.length !== 32) {
    throw new Error('Invalid EncodingAESKey length');
  }

  // AES CBC 的 iv 取 AESKey 的前 16 字节
  const iv = aesKey.subarray(0, 16);

  const encryptedBuf = Buffer.from(encrypt, 'base64');
  if (encryptedBuf.length === 0 || encryptedBuf.length % 16 !== 0) {
    throw new Error('Invalid encrypted message length');
  }

  const decipher = createDecipheriv('aes-256-cbc', aesKey, iv);

  // 微信的 PKCS#7 是按照 32 字节块进行填充的，而标准的 AES 块是 16 字节
  // 因此需要关闭自动去填充，手动处理
  decipher.setAutoPadding(false);

  let decryptedBuf = decipher.update(encryptedBuf);
  decryptedBuf = Buffer.concat([decryptedBuf, decipher.final()]);

  // 手动去除 PKCS#7 填充
  const pad = decryptedBuf[decryptedBuf.length - 1];
  if (pad < 1 || pad > 32 || pad > decryptedBuf.length) {
    throw new Error('Invalid PKCS#7 padding');
  }
  const padding = decryptedBuf.subarray(decryptedBuf.length - pad);
  if (!padding.every((byte) => byte === pad)) {
    throw new Error('Invalid PKCS#7 padding');
  }
  const unpaddedBuf = decryptedBuf.subarray(0, decryptedBuf.length - pad);

  // FullStr = random(16B) + msg_len(4B) + msg + appid
  if (unpaddedBuf.length < 20) {
    throw new Error('Decrypted buffer too short');
  }

  const msgLen = unpaddedBuf.readUInt32BE(16);
  if (20 + msgLen > unpaddedBuf.length) {
    throw new Error('Invalid decrypted message length');
  }
  const msgBuf = unpaddedBuf.subarray(20, 20 + msgLen);
  const msgAppIdBuf = unpaddedBuf.subarray(20 + msgLen);

  const msg = msgBuf.toString('utf8');
  const msgAppId = msgAppIdBuf.toString('utf8');

  if (msgAppId !== appId) {
    throw new Error('AppID mismatch');
  }

  const parsed = JSON.parse(msg) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Decrypted message must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}
