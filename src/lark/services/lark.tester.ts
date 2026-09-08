import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class LarkTesterService implements IntegrationTestProvider, OnModuleInit {
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('lark', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const client = new Lark.Client({
      appId: String(value.appId),
      appSecret: String(value.appSecret),
    });
    await client.auth.tenantAccessToken.create();
  }
}
