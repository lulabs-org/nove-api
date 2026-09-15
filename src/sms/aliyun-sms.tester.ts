import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { IntegrationTesterService } from '@/admin/integrations/services';
import {
  IntegrationTestProvider,
  IntegrationValues,
} from '@/admin/integrations/types';
import { RedisService } from '@/redis/redis.service';
import { AliyunSmsConfigValue, SmsService } from './services';

const TEST_LIMIT = 3;
const TEST_TTL_SECONDS = 10 * 60;

@Injectable()
export class AliyunSmsTester implements IntegrationTestProvider, OnModuleInit {
  private readonly fallbackAttempts = new Map<string, number[]>();

  constructor(
    private readonly testerService: IntegrationTesterService,
    private readonly smsService: SmsService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit(): void {
    this.testerService.registerProvider('aliyun-sms', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const countryCode = value.testCountryCode;
    const phoneNumber = value.testPhoneNumber;
    if (typeof countryCode !== 'string' || typeof phoneNumber !== 'string') {
      throw new BadRequestException('请输入国家代码和手机号');
    }
    await this.assertRateLimit(countryCode, phoneNumber);
    await this.smsService.sendTestSms(
      phoneNumber,
      countryCode,
      value as unknown as AliyunSmsConfigValue,
    );
  }

  private async assertRateLimit(countryCode: string, phoneNumber: string) {
    const target = createHash('sha256')
      .update(`${countryCode}:${phoneNumber}`)
      .digest('hex');
    const key = `integration:aliyun-sms:test:${target}`;
    const redis = this.redisService.getClient();
    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, TEST_TTL_SECONDS);
      if (count > TEST_LIMIT) throw new Error('SMS_TEST_RATE_LIMITED');
      return;
    }

    const cutoff = Date.now() - TEST_TTL_SECONDS * 1000;
    const attempts = (this.fallbackAttempts.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (attempts.length >= TEST_LIMIT) throw new Error('SMS_TEST_RATE_LIMITED');
    attempts.push(Date.now());
    this.fallbackAttempts.set(key, attempts);
  }
}
