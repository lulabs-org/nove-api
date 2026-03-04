/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-30 23:29:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-04 17:47:57
 * @FilePath: /nove_api/scripts/mjs/decrypt_data.mjs
 * @Description: 使用AES-256-CBC算法解密腾讯会议加密数据的工具脚本
 * 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */

import { createDecipheriv } from 'node:crypto';
import { config } from 'dotenv';

config();

const encryptedData = process.env.ENCRYPTED_DATA || '';

const encodingAesKey = process.env.TENCENT_MEETING_ENCODING_AES_KEY || '54235325';

try {
  const decodedKey = Buffer.from(encodingAesKey + '=', 'base64');

  if (decodedKey.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes, got ${decodedKey.length}`);
  }

  const decodedText = Buffer.from(encryptedData, 'base64');
  if (decodedText.length === 0) {
    throw new Error('Decoded encrypted text is empty');
  }

  const iv = decodedKey.subarray(0, 16);
  const cipherKey = decodedKey;

  const decipher = createDecipheriv('aes-256-cbc', cipherKey, iv);
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(decodedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  const plaintext = decrypted.toString('utf-8');
  console.log('Decrypted data:');
  console.log(plaintext);
} catch (error) {
  console.error('Decryption failed:', error);
}
