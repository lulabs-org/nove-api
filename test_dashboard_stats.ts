import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProfitSharingRecordService } from './src/profit-sharing/services/profit-sharing-record.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ProfitSharingRecordService);
  
  try {
    const stats = await service.getDashboardStats();
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error occurred:');
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();
