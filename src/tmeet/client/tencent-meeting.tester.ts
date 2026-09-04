import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigTestProvider, SystemConfigValues } from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';
import { generateSignature } from '../utils/crypto.util';

@Injectable()
export class TencentMeetingTesterService
  implements ConfigTestProvider, OnModuleInit
{
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('tencent-meeting', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
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
}
