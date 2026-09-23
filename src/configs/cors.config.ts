import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function parseCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRegexCsv(value?: string): RegExp[] {
  return parseCsv(value).map((pattern) => new RegExp(pattern));
}

/**
 * 获取 CORS 跨域安全配置
 */
export function getCorsConfig(): CorsOptions {
  const allowedOrigins = new Set(parseCsv(process.env.CORS_ORIGINS));
  const originRegexes = parseRegexCsv(process.env.CORS_ORIGIN_REGEXES);
  // Required true for cookie/session; can be kept for token-only auth
  const credentials = process.env.CORS_CREDENTIALS === 'true';

  return {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean) => void,
    ) => {
      if (!origin) return cb(null, true);

      if (allowedOrigins.has(origin)) return cb(null, true);
      if (originRegexes.some((re) => re.test(origin))) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-api-key',
    ],
  };
}
