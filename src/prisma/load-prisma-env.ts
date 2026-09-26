import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

// Preserve Prisma 6 .env interpolation without overriding injected variables.
expand(config({ quiet: true }));
