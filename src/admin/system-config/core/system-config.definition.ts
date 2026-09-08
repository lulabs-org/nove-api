import { Type } from '@nestjs/common';
import {
  ConfigDefinition,
  ConfigRegistryEntry,
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

