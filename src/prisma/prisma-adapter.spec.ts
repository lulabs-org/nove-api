import { PrismaPg } from '@prisma/adapter-pg';
import { createPrismaAdapter } from './prisma-adapter';

jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));

describe('createPrismaAdapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('preserves schema, pool limits and SSL settings from existing URLs', () => {
    createPrismaAdapter(
      'postgresql://user:pass@localhost/db?schema=tenant&connection_limit=4&pool_timeout=7&max_idle_connection_lifetime=20&sslmode=verify-full',
    );
    expect(PrismaPg).toHaveBeenCalledWith(
      {
        connectionString:
          'postgresql://user:pass@localhost/db?sslmode=verify-full',
        max: 4,
        connectionTimeoutMillis: 7000,
        idleTimeoutMillis: 20000,
      },
      { schema: 'tenant' },
    );
  });

  it('uses bounded pool defaults and the public schema', () => {
    createPrismaAdapter('postgres://user:pass@localhost/db');
    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({
        max: 10,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 300000,
      }),
      { schema: 'public' },
    );
  });

  it.each([
    'connection_limit=0',
    'connection_limit=-1',
    'pool_timeout=invalid',
    'pool_timeout=1.5',
  ])('rejects invalid pool configuration: %s', (parameter) => {
    expect(() =>
      createPrismaAdapter(`postgres://localhost/db?${parameter}`),
    ).toThrow();
    expect(PrismaPg).not.toHaveBeenCalled();
  });

  it('rejects missing or non-PostgreSQL URLs without echoing credentials', () => {
    expect(() => createPrismaAdapter('')).toThrow('DATABASE_URL is required');
    expect(() => createPrismaAdapter('invalid secret')).toThrow(
      'DATABASE_URL must be a valid PostgreSQL connection URL',
    );
    expect(() => createPrismaAdapter('prisma://secret@localhost')).toThrow(
      'DATABASE_URL must be a PostgreSQL connection URL',
    );
  });
  it('uses connect_timeout when no pool_timeout is configured', () => {
    createPrismaAdapter('postgres://localhost/db?connect_timeout=3');
    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeoutMillis: 3000 }),
      { schema: 'public' },
    );
  });
});
