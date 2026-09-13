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

function getOssTestConstructor(): OssTestClientConstructor {
  const mod = OSSModule as unknown;
  return (
    typeof mod === 'object' && mod !== null && 'default' in mod
      ? (mod as { default: unknown }).default
      : mod
  ) as OssTestClientConstructor;
}

@Injectable()
export class StorageTesterService
  implements IntegrationTestProvider, OnModuleInit
{
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('storage', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const toOptionalString = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean')
        return String(val);
      return '';
    };

    const region = toOptionalString(value.region).trim();
    const bucket = toOptionalString(value.bucket).trim();
    const publicBucket = toOptionalString(value.publicBucket).trim();
    const accessKeyId = toOptionalString(value.accessKeyId).trim();
    const accessKeySecret = toOptionalString(value.accessKeySecret).trim();

    if (!bucket || !accessKeyId || !accessKeySecret) {
      throw new BadRequestException(
        '请填写完整的存储桶、AccessKey ID 和 AccessKey Secret',
      );
    }

    const testBucket = async (targetBucket: string, label?: string) => {
      const OSS = getOssTestConstructor();
      const client = new OSS({
        region: region || 'oss-cn-hangzhou',
        bucket: targetBucket,
        accessKeyId,
        accessKeySecret,
        secure: true,
      });

      try {
        if (typeof client.getBucketInfo === 'function') {
          await client.getBucketInfo(targetBucket);
        } else if (typeof client.list === 'function') {
          await client.list({ 'max-keys': 1 });
        }
      } catch (error: unknown) {
        const err = error as { message?: string; name?: string };
        const message = err?.message || '未知错误';
        const prefix = label ? `${label} ` : '';
        throw new BadRequestException(
          `OSS 连通性测试失败: ${prefix}${message}`,
        );
      }
    };

    await testBucket(bucket);

    if (publicBucket && publicBucket !== bucket) {
      await testBucket(publicBucket, '公共存储桶');
    }
  }
}
