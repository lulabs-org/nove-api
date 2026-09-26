import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

// Preserve Prisma 6 .env interpolation without overriding injected variables.
const envPath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
expand(config({ path: envPath, quiet: true }));
