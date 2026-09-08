import { Type } from '@nestjs/common';
import {
  IntegrationDefinition,
  IntegrationRegistryEntry,
  IntegrationValues,
} from './integration.types';

export * from './integration.types';

export function defineIntegrationConfig<TDto extends object>(
  dto: Type<TDto>,
  definition: Omit<IntegrationDefinition<TDto>, 'dto'>,
): IntegrationDefinition<TDto> & IntegrationRegistryEntry {
  return { dto, ...definition } as IntegrationDefinition<TDto> & IntegrationRegistryEntry;
}

export function getDefaultValues(
  entry: IntegrationRegistryEntry,
): IntegrationValues {
  return { ...(entry.defaults ?? {}) };
}

export function getRequiredFields(entry: IntegrationRegistryEntry): string[] {
  return entry.required ?? [];
}

export function getSecretFields(entry: IntegrationRegistryEntry): string[] {
  return entry.secrets ?? [];
}
