import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import { ConfigTestProvider, SystemConfigValues } from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';

@Injectable()
export class LarkTesterService implements ConfigTestProvider, OnModuleInit {
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('lark', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
    const client = new Lark.Client({
      appId: String(value.appId),
      appSecret: String(value.appSecret),
    });
    await client.auth.tenantAccessToken.create();
  }
}
