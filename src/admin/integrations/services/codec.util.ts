import { decrypt, encrypt } from '@/common/utils/crypto.util';
import {
  IntegrationRegistryEntry,
  getRequiredFields,
  getSecretFields,
  IntegrationValues,
} from '../core';

export const MASKED_SECRET = '********';

/**
 * 将数据库中取出的配置进行解密（将 AES 密文还原为明文）
 * 如果解密失败，可以通过回调记录日志并忽略该脏数据
 */
export function decodeConfig(
  entry: IntegrationRegistryEntry,
  storedValue: IntegrationValues,
  onUnreadableSecret?: (field: string) => void,
): IntegrationValues {
  const value = { ...storedValue };

  for (const field of getSecretFields(entry)) {
    const secret = value[field];
    if (typeof secret !== 'string' || !secret) continue;

    try {
      value[field] = decrypt(secret);
    } catch {
      onUnreadableSecret?.(field);
      delete value[field];
    }
  }

  return value;
}

/**
 * 脱敏：给前端下发配置时，将所有涉及安全的字段（如密码、API Key）替换为 '********'
 */
export function maskConfig(
  entry: IntegrationRegistryEntry,
  plainValue: IntegrationValues,
): IntegrationValues {
  const value = { ...plainValue };
  for (const field of getSecretFields(entry)) {
    if (hasValue(value[field])) value[field] = MASKED_SECRET;
  }
  return value;
}

/**
 * 混合草稿数据：当用户提交“测试连接”时，将表单填写的 draft 与现有配置合并
 * 如果 draft 里传来的是 '********'，说明用户没改密码，需自动使用现有数据库里的明文密码替换
 */
export function mergeDraftConfig(
  entry: IntegrationRegistryEntry,
  currentValue: IntegrationValues,
  draftValue: Record<string, unknown>,
): IntegrationValues {
  const draft = { ...draftValue };
  for (const field of getSecretFields(entry)) {
    if (draft[field] === MASKED_SECRET || isBlankString(draft[field])) {
      delete draft[field];
    }
  }
  return { ...currentValue, ...draft } as IntegrationValues;
}

/**
 * 编码入库数据：处理前端传来的表单更新
 * 1. 过滤未定义的字段
 * 2. 如果收到 '********'，说明前端未修改密码，保持原加密数据不变
 * 3. 如果收到新明文密码，进行 AES 加密后保存
 */
export function encodeUpdateConfig(
  entry: IntegrationRegistryEntry,
  currentStoredValue: Record<string, unknown>,
  input: Record<string, unknown>,
): IntegrationValues {
  const normalizedInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  const value = { ...currentStoredValue, ...normalizedInput };

  for (const field of getSecretFields(entry)) {
    const secret = normalizedInput[field];
    if (secret === MASKED_SECRET || secret === '') {
      if (currentStoredValue[field] === undefined) delete value[field];
      else value[field] = currentStoredValue[field];
    } else if (typeof secret === 'string') {
      value[field] = encrypt(secret);
    }
  }

  return value as IntegrationValues;
}

/**
 * 判断某个模块是否“已配置”完毕（所有必填项都有值）
 */
export function isConfigured(
  entry: IntegrationRegistryEntry,
  value: IntegrationValues,
): boolean {
  return missingRequiredFields(entry, value).length === 0;
}

export function missingRequiredFields(
  entry: IntegrationRegistryEntry,
  value: IntegrationValues,
): string[] {
  return getRequiredFields(entry).filter(
    (field) => !hasValue(value[field]),
  );
}

export function containsEncryptedValues(
  entry: IntegrationRegistryEntry,
  value: IntegrationValues,
): boolean {
  return getSecretFields(entry).some((field) => hasValue(value[field]));
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function isBlankString(value: unknown): boolean {
  return typeof value === 'string' && !value.trim();
}
