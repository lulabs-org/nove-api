import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigTestProvider, SystemConfigValues } from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';

@Injectable()
export class WechatShopTesterService
  implements ConfigTestProvider, OnModuleInit
{
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('wechat-shop', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
    const response = await fetch(
      `${String(value.apiBaseUrl).replace(/\/$/, '')}/cgi-bin/stable_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credential',
          appid: value.appId,
          secret: value.appSecret,
          force_refresh: false,
        }),
      },
    );
    const body = (await response.json()) as {
      access_token?: string;
      errcode?: number;
    };
    if (!response.ok || body.errcode || !body.access_token) {
      throw new Error('微信小店凭证验证失败');
    }
  }
}
