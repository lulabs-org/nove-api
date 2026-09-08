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
  return { ...(entry.defaults ?? {}) };
}

export function getRequiredFields(entry: ConfigRegistryEntry): string[] {
  return entry.required ?? [];
}

export function getSecretFields(entry: ConfigRegistryEntry): string[] {
  return entry.secrets ?? [];
}


