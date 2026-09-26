import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'fs';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run database tests with NODE_ENV=production');
}

process.env.NODE_ENV = 'test';

// CI injects DATABASE_URL directly. Locally, load only .env.test, never .env.
if (existsSync('.env.test')) {
  expand(config({ path: '.env.test', override: true }));
}

export function assertSafeDatabaseUrl(value: string | undefined): void {
  if (!value) {
    throw new Error('Database tests require a local test DATABASE_URL');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Database tests require a valid PostgreSQL URL');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'postgres']);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !localHosts.has(url.hostname) ||
    !databaseName.toLowerCase().includes('test')
  ) {
    throw new Error(
      'Database tests may only connect to a local PostgreSQL test database',
    );
  }
}

assertSafeDatabaseUrl(process.env.DATABASE_URL);
if (process.env.DATABASE_URL_SYSTEM_TEST) {
  assertSafeDatabaseUrl(process.env.DATABASE_URL_SYSTEM_TEST);
}
