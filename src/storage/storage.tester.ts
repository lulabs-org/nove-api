import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import * as OSSModule from 'ali-oss';
import {
  IntegrationTestProvider,
  IntegrationTesterService,
  IntegrationValues,
} from '@/admin/integrations';

interface OssTestClient {
  getBucketInfo?(bucket: string): Promise<unknown>;
  list?(query: Record<string, unknown>): Promise<unknown>;
}

interface OssTestClientConstructor {
  new (options: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    secure: boolean;
  }): OssTestClient;
}

const OSS = OSSModule as unknown as OssTestClientConstructor;

@Injectable()
export class StorageTesterService
  implements IntegrationTestProvider, OnModuleInit
{
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('storage', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const region = String(value.region ?? '').trim();
    const bucket = String(value.bucket ?? '').trim();
    const accessKeyId = String(value.accessKeyId ?? '').trim();
    const accessKeySecret = String(value.accessKeySecret ?? '').trim();

    if (!bucket || !accessKeyId || !accessKeySecret) {
      throw new BadRequestException(
        '请填写完整的存储桶、AccessKey ID 和 AccessKey Secret',
      );
    }

    const client = new OSS({
      region: region || 'oss-cn-hangzhou',
      bucket,
      accessKeyId,
      accessKeySecret,
      secure: true,
    });

    try {
      if (typeof client.getBucketInfo === 'function') {
        await client.getBucketInfo(bucket);
      } else if (typeof client.list === 'function') {
        await client.list({ 'max-keys': 1 });
      }
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string };
      const message = err?.message || '未知错误';
      throw new BadRequestException(`OSS 连通性测试失败: ${message}`);
    }
  }
}
