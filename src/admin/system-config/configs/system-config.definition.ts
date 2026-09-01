import { Type } from '@nestjs/common';

export type SystemConfigValue = string | number | boolean;
export type SystemConfigValues = Record<string, SystemConfigValue>;

export interface EnvironmentSource<
  TValue extends SystemConfigValue = SystemConfigValue,
> {
  keys: readonly string[];
  read: (environment: NodeJS.ProcessEnv) => TValue | undefined;
}

export interface ConfigFieldDefinition<
  TValue extends SystemConfigValue = SystemConfigValue,
> {
  required?: boolean;
  secret?: boolean;
  default?: TValue;
  environment?: EnvironmentSource<TValue>;
}

type DtoFieldValue<TValue> =
  Exclude<TValue, null | undefined> extends SystemConfigValue
    ? Exclude<TValue, null | undefined>
    : SystemConfigValue;

type ConfigFields<TDto extends object> = {
  [TKey in keyof TDto]-?: ConfigFieldDefinition<DtoFieldValue<TDto[TKey]>>;
};

export interface ConfigDefinition<TDto extends object> {
  dto: Type<TDto>;
  description: string;
  fields: ConfigFields<TDto>;
}

export interface ConfigRegistryEntry {
  dto: Type<object>;
  description: string;
  fields: Record<string, ConfigFieldDefinition>;
}

export interface BootstrapEnvironmentConfig {
  values: SystemConfigValues;
  fields: string[];
}

export function defineSystemConfig<TDto extends object>(
  dto: Type<TDto>,
  definition: Omit<ConfigDefinition<TDto>, 'dto'>,
): ConfigDefinition<TDto> & ConfigRegistryEntry {
  return { dto, ...definition } as ConfigDefinition<TDto> & ConfigRegistryEntry;
}

export function getDefaultValues(
  entry: ConfigRegistryEntry,
): SystemConfigValues {
  return Object.fromEntries(
    Object.entries(entry.fields)
      .filter(([, field]) => field.default !== undefined)
      .map(([name, field]) => [name, field.default]),
  ) as SystemConfigValues;
}

export function getRequiredFields(entry: ConfigRegistryEntry): string[] {
  return Object.entries(entry.fields)
    .filter(([, field]) => field.required)
    .map(([name]) => name);
}

export function getSecretFields(entry: ConfigRegistryEntry): string[] {
  return Object.entries(entry.fields)
    .filter(([, field]) => field.secret)
    .map(([name]) => name);
}

export function readBootstrapEnvironment(
  entry: ConfigRegistryEntry,
  environment: NodeJS.ProcessEnv = process.env,
): BootstrapEnvironmentConfig {
  const values: SystemConfigValues = {};
  const fields: string[] = [];

  for (const [name, field] of Object.entries(entry.fields)) {
    if (!field.environment) continue;

    const isExplicit = field.environment.keys.some((key) => {
      const value = environment[key];
      return value !== undefined && value.trim() !== '';
    });
    if (isExplicit) fields.push(name);

    const value = field.environment.read(environment);
    if (value !== undefined && value !== '') values[name] = value;
  }

  return { values, fields };
}

export const environment = {
  string(
    key: string,
    options: { trim?: boolean } = { trim: true },
  ): EnvironmentSource<string> {
    return {
      keys: [key],
      read: (values) => {
        const value = values[key];
        if (value === undefined) return undefined;
        return options.trim === false ? value : value.trim();
      },
    };
  },

  number(key: string): EnvironmentSource<number> {
    return {
      keys: [key],
      read: (values) =>
        values[key] === undefined ? undefined : Number(values[key]),
    };
  },

  boolean(key: string): EnvironmentSource<boolean> {
    return {
      keys: [key],
      read: (values) =>
        values[key] === undefined ? undefined : values[key] === 'true',
    };
  },

  custom<TValue extends SystemConfigValue>(
    keys: readonly string[],
    read: (values: NodeJS.ProcessEnv) => TValue | undefined,
  ): EnvironmentSource<TValue> {
    return { keys, read };
  },
};

export const SYSTEM_CONFIG_ENV_IMPORT_KEY = 'SYSTEM_CONFIG_ENV_IMPORT_V1';

export interface SystemConfigEnvironmentImportModule {
  status: 'imported' | 'existing' | 'skipped';
  fields: string[];
  configured: boolean;
}

export interface SystemConfigEnvironmentImportMetadata {
  version: 1;
  completedAt: string;
  modules: Record<string, SystemConfigEnvironmentImportModule>;
}
