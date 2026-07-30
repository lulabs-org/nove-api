import { decrypt, getSignature } from '@wecom/crypto';

/**
 * 企业微信消息解密与签名验证工具
 * 基于 @wecom/crypto 官方库实现
 */

/**
 * 微信/企业微信 签名生成工具
 *
 * @param token 企业微信后台配置的 Token
 * @param timestamp 时间戳
 * @param nonce 随机串
 * @param encrypt 密文
 * @returns SHA1 签名字符串
 */
export function generateSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
): string {
  return getSignature(token, timestamp, nonce, encrypt);
}

export class WecomCryptoError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'WecomCryptoError';
    this.code = code;
  }
}

/**
 * 企业微信消息解密工具
 *
 * @param encrypt 企业微信推送的加密消息体 (Base64)
 * @param encodingAesKey 开发者配置的 EncodingAESKey
 * @param corpId 企业微信的 CorpID (对应 ReceiveId)
 * @returns 解密并解析后的字符串（通常是 XML）
 */
export function decryptWecomMessage(
  encrypt: string,
  encodingAesKey: string,
  corpId: string,
): string {
  const { message, id } = decrypt(encodingAesKey, encrypt);

  if (id !== corpId) {
    throw new WecomCryptoError('ReceiveId (CorpID) mismatch', -40005);
  }

  return message;
}
