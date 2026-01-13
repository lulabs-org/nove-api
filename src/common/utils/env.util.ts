import { InternalServerErrorException } from '@nestjs/common';

export function getRequiredEnv(key: string, errorMessage?: string): string {
  const value = process.env[key];

  if (!value) {
    throw new InternalServerErrorException(
      errorMessage ?? `Missing required environment variable: ${key}`,
    );
  }

  return value;
}

export function getRequiredEnvWithMinLength(
  key: string,
  minLength: number,
  errorMessage?: string,
): string {
  const value = getRequiredEnv(key, errorMessage);

  if (value.length < minLength) {
    throw new InternalServerErrorException(
      errorMessage ?? `${key} must be at least ${minLength} characters long`,
    );
  }

  return value;
}
