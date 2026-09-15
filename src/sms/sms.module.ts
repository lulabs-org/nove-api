import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { AliyunSmsConfigService } from './aliyun-sms-config.service';
import { IntegrationsRepository } from '@/admin/integrations/repositories';

@Module({
  providers: [SmsService, AliyunSmsConfigService, IntegrationsRepository],
  exports: [SmsService, AliyunSmsConfigService],
})
export class SmsModule {}
