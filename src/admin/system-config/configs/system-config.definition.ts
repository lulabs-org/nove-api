import { Type } from '@nestjs/common';
import {
  BootstrapEnvironmentConfig,
  ConfigDefinition,
  ConfigRegistryEntry,
  EnvironmentSource,
  SystemConfigValue,
  SystemConfigValues,
} from './system-config.types';

export * from './system-config.types';
export * from './system-config.constants';

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

