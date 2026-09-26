import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Helper function to create a NestJS test application
 * with common configuration and setup
 */
export async function createTestApp(
  moduleImports: NonNullable<ModuleMetadata['imports']> = [],
): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      ...moduleImports,
    ],
  }).compile();

  const app = module.createNestApplication();
  await app.init();

  return { app, module };
}

/**
 * Helper function to cleanly close test application
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Helper to get mock configuration service
 */
export const getMockConfigService = (
  customConfig: Record<string, unknown> = {},
) => ({
  get: jest.fn().mockImplementation((key: string) => {
    const defaultConfig: Record<string, unknown> = {
      TENCENT_MEETING_TOKEN: 'test_token',
      TENCENT_MEETING_ENCODING_AES_KEY: 'test_encoding_aes_key',
      TENCENT_MEETING_SECRET_ID: 'test_secret_id',
      TENCENT_MEETING_SECRET_KEY: 'test_secret_key',
      TENCENT_MEETING_APP_ID: 'test_app_id',
      TENCENT_MEETING_SDK_ID: 'test_sdk_id',
      USER_ID: 'test_user_id',
      JWT_SECRET: 'test_jwt_secret',
      DATABASE_URL: 'test_database_url',
      ...customConfig,
    };
    return defaultConfig[key] || '';
  }),
});
