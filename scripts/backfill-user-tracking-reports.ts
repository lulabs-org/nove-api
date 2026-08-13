import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const marker = '-- Idempotent backfill.';
const migration = readFileSync(
  'prisma/migrations/20260814010000_add_user_tracking_reports/migration.sql',
  'utf8',
);
const start = migration.indexOf(marker);
if (start < 0) throw new Error('Backfill marker not found in migration');

const result = spawnSync(
  'psql',
  [process.env.DATABASE_URL ?? '', '-v', 'ON_ERROR_STOP=1'],
  {
    input: migration.slice(start),
    stdio: ['pipe', 'inherit', 'inherit'],
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
