import 'dotenv/config';
import OSS from 'ali-oss';

const apply = process.argv.includes('--apply');

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function values(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function configuredOrigins(): string[] {
  const candidates = [
    process.env.DRIVE_OSS_CORS_ORIGINS,
    process.env.CORS_ORIGINS,
    process.env.NOVE_ADMIN_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter((value) => /^https?:\/\/[^*]+$/i.test(value));

  const origins = [...new Set(candidates)];
  if (origins.length === 0) {
    throw new Error(
      'Configure DRIVE_OSS_CORS_ORIGINS, CORS_ORIGINS, or NOVE_ADMIN_URL with an explicit origin',
    );
  }
  return origins;
}

function includesAll(actual: string[], expected: string[]): boolean {
  return expected.every((value) => actual.includes(value));
}

async function main() {
  const bucket = required('ALIYUN_OSS_BUCKET');
  const origins = configuredOrigins();
  const client = new OSS({
    region: required('ALIYUN_OSS_REGION'),
    bucket,
    accessKeyId: required('ALIBABA_CLOUD_ACCESS_KEY_ID'),
    accessKeySecret: required('ALIBABA_CLOUD_ACCESS_KEY_SECRET'),
    secure: true,
  });

  let currentRules: OSS.CORSRule[];
  try {
    currentRules = (await client.getBucketCORS(bucket)).rules;
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;
    if (code !== 'NoSuchCORSConfiguration') throw error;
    currentRules = [];
  }
  const requiredMethods = ['PUT', 'GET', 'HEAD'];
  const requiredExposedHeaders = ['ETag', 'Content-Length', 'Content-Type'];
  const alreadyConfigured = currentRules.some(
    (rule) =>
      includesAll(values(rule.allowedOrigin), origins) &&
      includesAll(values(rule.allowedMethod), requiredMethods) &&
      values(rule.allowedHeader).includes('*') &&
      includesAll(values(rule.exposeHeader), requiredExposedHeaders),
  );

  console.log(
    JSON.stringify(
      {
        bucket,
        origins,
        existingRuleCount: currentRules.length,
        alreadyConfigured,
        apply,
      },
      null,
      2,
    ),
  );

  if (!apply || alreadyConfigured) return;

  await client.putBucketCORS(bucket, [
    ...currentRules,
    {
      allowedOrigin: origins,
      allowedMethod: requiredMethods,
      allowedHeader: ['*'],
      exposeHeader: requiredExposedHeaders,
      maxAgeSeconds: '600',
    },
  ]);
  console.log('OSS CORS configuration applied');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to configure OSS CORS: ${message}`);
  process.exitCode = 1;
});
