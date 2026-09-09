import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class WecomTesterService
  implements IntegrationTestProvider, OnModuleInit
{
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('wecom', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const corpId = String(value.corpId ?? '').trim();
    const corpSecret = String(value.corpSecret ?? '').trim();
    const apiBaseUrl = String(value.apiBaseUrl || 'https://qyapi.weixin.qq.com')
      .trim()
      .replace(/\/+$/, '');

    if (!corpId || !corpSecret) {
      throw new BadRequestException(
        '请填写完整的企业 ID (corpId) 和应用 Secret (corpSecret)',
      );
    }

    const encodingAesKey = String(value.encodingAesKey ?? '').trim();
    if (encodingAesKey && encodingAesKey.length !== 43) {
      throw new BadRequestException('企业微信 EncodingAESKey 必须为 43 位字符');
    }

    const url = `${apiBaseUrl}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`企业微信服务器响应异常: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
      access_token?: string;
    };

    if (data.errcode !== 0 || !data.access_token) {
      throw new Error(
        `企业微信凭证验证失败: [${data.errcode}] ${data.errmsg || '未知错误'}`,
      );
    }
  }
}
