/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:06:48
 * @FilePath: /lulab_backend/src/common/utils/random.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { randomBytes } from 'crypto';

/**
 * Generates a random numeric code with the specified length.
 *
 * The generated code will always have exactly the specified number of digits,
 * with no leading zeros. For example, a length of 6 will generate a number
 * between 100000 and 999999.
 *
 * @param length - The length of the numeric code to generate (default: 6)
 * @returns A random numeric code as a string, or empty string if length <= 0
 *
 * @example
 * generateNumericCode(4) // '1234' to '9999'
 * generateNumericCode(6) // '123456' to '999999'
 * generateNumericCode()  // '123456' to '999999' (default length 6)
 */
export function generateNumericCode(length = 6): string {
  if (length <= 0) return '';
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Generates a cryptographically secure random token.
 *
 * Uses Node.js crypto.randomBytes to generate random bytes and encodes them
 * in base64url format (URL-safe base64 without padding). This is suitable
 * for generating tokens, session IDs, API keys, and other secure identifiers.
 *
 * @param byteLength - The number of random bytes to generate (default: 48)
 * @returns A URL-safe base64 encoded random token
 *
 * @example
 * generateRandomToken(16) // 22-character token
 * generateRandomToken(32) // 43-character token
 * generateRandomToken()   // 64-character token (default 48 bytes)
 */
export function generateRandomToken(byteLength = 48): string {
  return randomBytes(byteLength).toString('base64url');
}
