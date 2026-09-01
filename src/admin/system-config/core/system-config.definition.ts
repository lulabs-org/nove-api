import { Type } from '@nestjs/common';
import {
  ConfigDefinition,
  ConfigRegistryEntry,
  EnvironmentSource,
  SystemConfigValues,
} from './system-config.types';

export * from './system-config.types';

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

export function readEnvironment(
  entry: ConfigRegistryEntry,
  environment: NodeJS.ProcessEnv = process.env,
): SystemConfigValues {
  const values: SystemConfigValues = {};

  for (const [name, field] of Object.entries(entry.fields)) {
    if (!field.environment) continue;

    const value = field.environment.read(environment);
    if (value !== undefined && value !== '') values[name] = value;
  }

  return values;
}

export const environment = {
  string(key: string): EnvironmentSource<string> {
    return {
      key,
      read: (values) => {
        const value = values[key];
        return value === undefined ? undefined : value.trim();
      },
    };
  },

  number(key: string): EnvironmentSource<number> {
    return {
      key,
      read: (values) =>
        values[key] === undefined ? undefined : Number(values[key]),
    };
  },

  boolean(key: string): EnvironmentSource<boolean> {
    return {
      key,
      read: (values) =>
        values[key] === undefined ? undefined : values[key] === 'true',
    };
  },
};
