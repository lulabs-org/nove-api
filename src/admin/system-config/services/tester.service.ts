import { BadRequestException, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as Lark from '@larksuiteoapi/node-sdk';
import * as nodemailer from 'nodemailer';
import { generateSignature } from '@/integrations/tencent-meeting/utils/crypto.util';
import { SystemConfigService } from './system-config.service';
import { SystemConfigValues } from '../registries/system-config.registry';

export interface TestResult {
  orgId: string;
  success: boolean;
  message: string;
}

@Injectable()
export class TesterService {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async testConfig(
    orgId: string,
    module: string,
    draft: Record<string, unknown>,
  ): Promise<TestResult> {
    const { value } = await this.systemConfigService.resolveDraftConfig(
      orgId,
      module,
      draft,
    );

    try {
      await this.withTimeout(this.runTest(module, value), 15_000);
      return { orgId, success: true, message: '连接测试成功' };
    } catch (error) {
      return {
        orgId,
        success: false,
        message: this.safeFailureMessage(error),
      };
    }
  }

  private runTest(module: string, value: SystemConfigValues): Promise<void> {
    switch (module) {
      case 'mail':
        return this.testMail(value);
      case 'wechat-shop':
        return this.testWechatShop(value);
      case 'ai':
        return this.testAi(value);
      case 'tencent-meeting':
        return this.testTencentMeeting(value);
      case 'lark':
        return this.testLark(value);
      default:
        throw new BadRequestException('不支持测试该配置模块');
    }
  }

  private async testMail(value: SystemConfigValues): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: String(value.host),
      port: Number(value.port),
      secure: Boolean(value.secure),
      auth: { user: String(value.user), pass: String(value.pass) },
    });
    try {
      await transporter.verify();
    } finally {
      transporter.close();
    }
  }

  private async testWechatShop(value: SystemConfigValues): Promise<void> {
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

  private async testAi(value: SystemConfigValues): Promise<void> {
    const client = new OpenAI({
      apiKey: String(value.apiKey),
      baseURL: String(value.baseUrl),
    });
    await client.chat.completions.create({
      model: String(value.model),
      max_tokens: 1,
      temperature: 0,
      messages: [{ role: 'user', content: 'ping' }],
    });
  }

  private async testTencentMeeting(value: SystemConfigValues): Promise<void> {
    const endTime = Math.floor(Date.now() / 1000);
    const requestUri = `/v1/corp/records?${new URLSearchParams({
      start_time: String(endTime - 60),
      end_time: String(endTime),
      page_size: '1',
      page: '1',
      operator_id: String(value.userId),
      operator_id_type: '1',
    }).toString()}`;
    const timestamp = String(endTime);
    const nonce = String(Math.floor(Math.random() * 100000));
    const signature = generateSignature(
      String(value.secretKey),
      'GET',
      String(value.secretId),
      nonce,
      timestamp,
      requestUri,
      '',
    );
    const response = await fetch(`https://api.meeting.qq.com${requestUri}`, {
      headers: {
        'X-TC-Key': String(value.secretId),
        'X-TC-Timestamp': timestamp,
        'X-TC-Nonce': nonce,
        'X-TC-Signature': signature,
        AppId: String(value.appId),
        SdkId: String(value.sdkId),
        'X-TC-Registered': '1',
      },
    });
    const body = (await response.json()) as { error_info?: unknown };
    if (!response.ok || body.error_info) {
      throw new Error('腾讯会议 API 凭证验证失败');
    }

    const aesKey = String(value.encodingAesKey ?? '');
    if (aesKey && Buffer.from(`${aesKey}=`, 'base64').length !== 32) {
      throw new Error('腾讯会议 Encoding AES Key 格式不正确');
    }
  }

  private async testLark(value: SystemConfigValues): Promise<void> {
    const client = new Lark.Client({
      appId: String(value.appId),
      appSecret: String(value.appSecret),
    });
    await client.auth.tenantAccessToken.create();

    const appToken = String(value.bitableAppToken);
    const tableIds = [
      value.meetingTableId,
      value.meetingUserTableId,
      value.recordingFileTableId,
      value.personalSummaryTableId,
    ];
    await Promise.all(
      tableIds.map((tableId) =>
        client.bitable.v1.appTableField.list({
          path: {
            app_token: appToken,
            table_id: String(tableId),
          },
          params: { page_size: 1 },
        }),
      ),
    );
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private safeFailureMessage(error: unknown): string {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof Error && error.message === 'timeout') {
      return '连接测试超时，请检查服务地址和网络访问策略';
    }
    return '连接测试失败，请检查凭证、服务权限和网络配置';
  }
}
