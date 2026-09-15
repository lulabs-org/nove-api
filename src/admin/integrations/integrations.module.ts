import { Module } from '@nestjs/common';
import { IntegrationsController } from './controllers';
import { IntegrationsRepository } from './repositories';
import { IntegrationsService, IntegrationTesterService } from './services';
import { SmsModule } from '@/sms/sms.module';
import { RedisModule } from '@/redis/redis.module';
import { AliyunSmsTester } from '@/sms/aliyun-sms.tester';

@Module({
  imports: [SmsModule, RedisModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    IntegrationTesterService,
    AliyunSmsTester,
  ],
  exports: [IntegrationsService, IntegrationTesterService],
})
export class IntegrationsModule {}
