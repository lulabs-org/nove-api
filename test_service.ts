import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MeetingService } from './src/meeting/service/meeting.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const meetingService = app.get(MeetingService);
  const text = await meetingService.getTranscriptByRecordingId('cmju21wam0007p0013pcvfmj7');
  console.log("----- TRANSCRIPT START -----");
  console.log(text.substring(0, 1000) + (text.length > 1000 ? '\n... (truncated)' : ''));
  console.log("----- TRANSCRIPT END -----");
  await app.close();
}

bootstrap().catch(console.error);
