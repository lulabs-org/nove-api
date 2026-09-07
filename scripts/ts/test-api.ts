import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TMeetApiService } from '../../src/tmeet/client';
import { tencentMeetingConfig } from '../../src/configs/tencent-mtg.config';
import { PrismaClient } from '@prisma/client';
import { SystemConfigService } from '../../src/admin/system-config/services';

async function bootstrap() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [tencentMeetingConfig],
      }),
    ],
    providers: [
      TMeetApiService,
      {
        provide: SystemConfigService,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          getEffectiveConfig: (orgId: string, module: string) =>
            Promise.resolve({
              orgId,
              module,
              value: {
                appId: configService.get<string>('TENCENT_MEETING_APP_ID'),
                sdkId: configService.get<string>('TENCENT_MEETING_SDK_ID'),
                secretId: configService.get<string>(
                  'TENCENT_MEETING_SECRET_ID',
                ),
                secretKey: configService.get<string>(
                  'TENCENT_MEETING_SECRET_KEY',
                ),
                userId: configService.get<string>('USER_ID'),
              },
            }),
        }),
      },
    ],
  }).compile();

  const tencentApi = moduleRef.get(TMeetApiService);
  const prisma = new PrismaClient();

  const minutes = await prisma.minute.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (minutes.length === 0 || !minutes[0].externalId) {
    console.log('No recordings found or missing externalId');
    return;
  }

  const recordFileId = minutes[0].externalId;
  const operatorId = 'woaJARCQAA65b_BO6kq2pTSG-yvvjc_g';
  const orgId = process.env.ORG_ID;

  if (!orgId) {
    throw new Error('ORG_ID is required');
  }

  try {
    console.log('=== Testing getTranscript with limit=200 ===');
    const res = await tencentApi.getTranscript({
      orgId,
      recordFileId,
      operatorId,
      operatorIdType: 1,
      limit: 200,
    });
    console.log(
      'Transcript paragraphs count:',
      res.minutes?.paragraphs?.length || 0,
    );
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }

  await prisma.$disconnect();
}

void bootstrap();
