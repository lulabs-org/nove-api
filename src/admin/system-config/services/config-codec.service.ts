import { Injectable } from '@nestjs/common';
import { decrypt, encrypt } from '@/common/utils/crypto.util';
import {
  ConfigRegistryEntry,
  getDefaultValues,
  getRequiredFields,
  getSecretFields,
  SystemConfigValues,
} from '../core';

const MASKED_SECRET = '********';

/**
 * 配置编解码服务
 * 专门处理配置项的“加密、解密、脱敏展示、默认值填充”等纯数据转换工作
 */
@Injectable()
export class ConfigCodecService {
  defaults(entry: ConfigRegistryEntry): SystemConfigValues {
    return getDefaultValues(entry);
  }

  /**
   * 将数据库中取出的配置进行解密（将 AES 密文还原为明文）
   * 如果解密失败，可以选择通过回调忽略该脏数据
   */
  decode(
    entry: ConfigRegistryEntry,
    storedValue: SystemConfigValues,
    onUnreadableSecret?: (field: string) => void,
  ): SystemConfigValues {
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
  mask(
    entry: ConfigRegistryEntry,
    plainValue: SystemConfigValues,
  ): SystemConfigValues {
    const value = { ...plainValue };
    for (const field of getSecretFields(entry)) {
      if (this.hasValue(value[field])) value[field] = MASKED_SECRET;
    }
    return value;
  }

  /**
   * 混合草稿数据：当用户提交“测试连接”时，将表单填写的 draft 与现有配置合并
   * 如果 draft 里传来的是 '********'，说明用户没改密码，需自动使用现有数据库里的明文密码替换
   */
  mergeDraft(
    entry: ConfigRegistryEntry,
    currentValue: SystemConfigValues,
    draftValue: Record<string, unknown>,
  ): SystemConfigValues {
    const draft = { ...draftValue };
    for (const field of getSecretFields(entry)) {
      if (draft[field] === MASKED_SECRET || this.isBlankString(draft[field])) {
        delete draft[field];
      }
    }
    return { ...currentValue, ...draft } as SystemConfigValues;
  }

  /**
   * 编码入库数据：处理前端传来的表单更新
   * 1. 过滤未定义的字段
   * 2. 如果收到 '********'，说明前端未修改密码，保持原加密数据不变
   * 3. 如果收到新明文密码，进行 AES 加密后保存
   */
  encodeUpdate(
    entry: ConfigRegistryEntry,
    currentStoredValue: Record<string, unknown>,
    input: Record<string, unknown>,
  ): SystemConfigValues {
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

    return value as SystemConfigValues;
  }

  /**
   * 判断某个模块是否“已配置”完毕（所有必填项都有值）
   */
  isConfigured(entry: ConfigRegistryEntry, value: SystemConfigValues): boolean {
    return this.missingRequiredFields(entry, value).length === 0;
  }

  missingRequiredFields(
    entry: ConfigRegistryEntry,
    value: SystemConfigValues,
  ): string[] {
    return getRequiredFields(entry).filter(
      (field) => !this.hasValue(value[field]),
    );
  }

  containsEncryptedValues(
    entry: ConfigRegistryEntry,
    value: SystemConfigValues,
  ): boolean {
    return getSecretFields(entry).some((field) => this.hasValue(value[field]));
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  private isBlankString(value: unknown): boolean {
    return typeof value === 'string' && !value.trim();
  }
}
