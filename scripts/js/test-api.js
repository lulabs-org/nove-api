const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { TencentApiService } = require('./dist/integrations/tencent-meeting/services/api.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const tencentApi = app.get(TencentApiService);

  const meetingId = '12536410613901019222';
  const subMeetingId = '1770084000';
  const userId = 'woaJARCQAA65b_BO6kq2pTSG-yvvjc_g';
  const startTime = 1770084000;
  const endTime = 1770094000;

  try {
    console.log("=== Testing getParticipants WITHOUT time ===");
    const res1 = await tencentApi.getParticipants(meetingId, userId, subMeetingId);
    console.log("Result 1:", JSON.stringify(res1).substring(0, 200));
  } catch (e) {
    console.error("Error 1:", e.message);
  }

  try {
    console.log("\n=== Testing getParticipants WITH time ===");
    const res2 = await tencentApi.getParticipants(meetingId, userId, subMeetingId, undefined, undefined, startTime, endTime);
    console.log("Result 2:", JSON.stringify(res2).substring(0, 200));
  } catch (e) {
    console.error("Error 2:", e.message);
  }

  await app.close();
}

bootstrap();
