import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TencentApiService } from '../../src/integrations/tencent-meeting/services/api.service';
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
    providers: [TencentApiService],
  }).compile();

  const tencentApi = moduleRef.get(TencentApiService);
  const prisma = new PrismaClient();

  const recordings = await prisma.meetingRecording.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (recordings.length === 0) {
    console.log("No recordings found");
    return;
  }

  const recordFileId = recordings[0].externalId;
  const operatorId = 'woaJARCQAA65b_BO6kq2pTSG-yvvjc_g';

  try {
    console.log("=== Testing getTranscript with page=1, pageSize=200 ===");
    const res = await tencentApi.getTranscript(recordFileId, operatorId, 1, 1, 200);
    console.log("Transcript paragraphs count:", res.minutes?.paragraphs?.length || 0);
  } catch (e) {
    console.error("Error:", e.message);
  }

  await prisma.$disconnect();
}

bootstrap();
