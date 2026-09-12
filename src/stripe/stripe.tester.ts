import { Injectable, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class StripeTesterService
  implements IntegrationTestProvider, OnModuleInit
{
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('stripe', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const secretKey = String(value.secretKey || '').trim();
    if (!secretKey) {
      throw new Error('Stripe Secret Key is required');
    }

    const stripe = new Stripe(secretKey, { timeout: 10000 });
    // 通过获取账户余额验证 API Key 的合法性与网络连通性
    await stripe.balance.retrieve();
  }
}
