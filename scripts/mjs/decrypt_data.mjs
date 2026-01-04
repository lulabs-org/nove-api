/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-30 23:29:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 10:44:29
 * @FilePath: /lulab_backend/docs/developer/integrations/tencent-meeting/scripts/decrypt_data.mjs
 * @Description: 
 * 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */

import { createDecipheriv } from 'node:crypto';
import { config } from 'dotenv';

config();

const encryptedData = '3jnIaZAJVDqkO+7VxN5L50asbuP9ERlJv3dJdW2zwdtv8ACWbzrN3lk64kgtEfhx3cG7bDAoQBz8y3GUqS1+jCffbJj7t06DmXmrwW1vXfgSsSXY93ywwhoWsrIN+r2cvaRZ1ZbGv0wY+useHTMRuzm0pZWhlwky0Pial400a5n3SMXOUQ/f4ja7nUtACZBTXyljqL3pN0vret6gJ8C+iT6BHVMSGmgL0wPOrp5+YCGLdga3mHpTVwRQv7QW4vnSjrIQVwhh8X+OqcqzjxYA94s03Cqp+9jQWgmEINl/dK7EUbIeQJScVrQY=';

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
