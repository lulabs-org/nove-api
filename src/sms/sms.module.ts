import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@/admin/integrations';
import { RedisModule } from '@/redis/redis.module';
import { SmsService, AliyunSmsConfigService } from './services';
import { AliyunSmsTester } from './aliyun-sms.tester';

@Module({
  imports: [IntegrationsModule, RedisModule],
  providers: [SmsService, AliyunSmsConfigService, AliyunSmsTester],
  exports: [SmsService, AliyunSmsConfigService, AliyunSmsTester],
})
export class SmsModule {}
