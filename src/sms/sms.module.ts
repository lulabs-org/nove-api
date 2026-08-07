import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { aliyunConfig } from '../configs/aliyun.config';

@Module({
  imports: [ConfigModule.forFeature(aliyunConfig)],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
