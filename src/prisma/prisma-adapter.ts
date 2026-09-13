import { PrismaPg } from '@prisma/adapter-pg';

/** Map supported Prisma URL options to the node-postgres pool. */
export function createPrismaAdapter(
  connectionString = process.env.DATABASE_URL,
) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  const nonNegativeInteger = (key: string, fallback: number) => {
    const value = url.searchParams.get(key);
    if (value === null) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid DATABASE_URL parameter: ${key}`);
    }
    return parsed;
  };
  const schema = url.searchParams.get('schema') || 'public';
  const max = nonNegativeInteger('connection_limit', 10);
  if (max === 0) throw new Error('connection_limit must be greater than zero');
  const connectionTimeoutMillis =
    nonNegativeInteger(
      'pool_timeout',
      nonNegativeInteger('connect_timeout', 10),
    ) * 1000;
  const idleTimeoutMillis =
    nonNegativeInteger('max_idle_connection_lifetime', 300) * 1000;
  for (const key of [
    'schema',
    'connection_limit',
    'pool_timeout',
    'connect_timeout',
    'max_idle_connection_lifetime',
  ]) {
    url.searchParams.delete(key);
  }
  return new PrismaPg(
    {
      connectionString: url.toString(),
      max,
      connectionTimeoutMillis,
      idleTimeoutMillis,
    },
    { schema },
  );
}
