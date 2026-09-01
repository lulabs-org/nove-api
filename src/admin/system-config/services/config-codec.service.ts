import { Injectable } from '@nestjs/common';
import { decrypt, encrypt } from '@/common/utils/crypto.util';
import {
  ConfigRegistryEntry,
  getDefaultValues,
  getRequiredFields,
  getSecretFields,
  SystemConfigValues,
} from '../configs';

const MASKED_SECRET = '********';
const ENCRYPTED_VALUE_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]*$/i;

@Injectable()
export class ConfigCodecService {
  defaults(entry: ConfigRegistryEntry): SystemConfigValues {
    return getDefaultValues(entry);
  }

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

  normalizeBootstrap(
    module: string,
    entry: ConfigRegistryEntry,
    plainValue: SystemConfigValues,
    storedValue: SystemConfigValues,
  ): { plainValue: SystemConfigValues; storedValue: SystemConfigValues } {
    const normalizedPlainValue = { ...plainValue };
    const normalizedStoredValue = { ...plainValue };

    for (const field of getSecretFields(entry)) {
      const storedSecret = storedValue[field];
      if (this.hasValue(storedSecret)) {
        const normalized = this.normalizeStoredSecret(
          module,
          field,
          storedSecret,
        );
        normalizedPlainValue[field] = normalized.plaintext;
        normalizedStoredValue[field] = normalized.encrypted;
        continue;
      }

      const importedSecret = normalizedPlainValue[field];
      if (typeof importedSecret === 'string' && importedSecret) {
        normalizedStoredValue[field] = encrypt(importedSecret);
      }
    }

    return {
      plainValue: normalizedPlainValue,
      storedValue: normalizedStoredValue,
    };
  }

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

  private normalizeStoredSecret(
    module: string,
    field: string,
    value: unknown,
  ): { plaintext: string; encrypted: string } {
    if (typeof value !== 'string') {
      throw new Error(`Invalid stored secret type for ${module}.${field}`);
    }
    if (!ENCRYPTED_VALUE_PATTERN.test(value)) {
      return { plaintext: value, encrypted: encrypt(value) };
    }

    try {
      return { plaintext: decrypt(value), encrypted: value };
    } catch {
      throw new Error(
        `Stored encrypted secret is unreadable: ${module}.${field}`,
      );
    }
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  private isBlankString(value: unknown): boolean {
    return typeof value === 'string' && !value.trim();
  }
}
