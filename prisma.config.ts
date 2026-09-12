import './src/prisma/load-prisma-env';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Generation must also work in Docker without database credentials.
  // Database commands require DATABASE_URL and fail if it is absent.
  datasource: { url: process.env.DATABASE_URL },
});
