import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TMeetApiService } from '../../src/tmeet/client';
import { tencentMeetingConfig } from '../../src/configs/tencent-mtg.config';
import { PrismaClient } from '@prisma/client';

async function bootstrap() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [tencentMeetingConfig],
      }),
    ],
    providers: [
      {
        provide: TMeetApiService,
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          new TMeetApiService({
            appId: config.get<string>('TENCENT_MEETING_APP_ID') ?? '',
            sdkId: config.get<string>('TENCENT_MEETING_SDK_ID') ?? '',
            secretId: config.get<string>('TENCENT_MEETING_SECRET_ID') ?? '',
            secretKey: config.get<string>('TENCENT_MEETING_SECRET_KEY') ?? '',
            userId: config.get<string>('USER_ID') ?? '',
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

  try {
    console.log('=== Testing getTranscript with limit=200 ===');
    const res = await tencentApi.getTranscript({
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
