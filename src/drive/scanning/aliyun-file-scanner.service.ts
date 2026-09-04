import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Credential from '@alicloud/credentials';
import Sas20181203, * as $Sas20181203 from '@alicloud/sas20181203';
import { $OpenApiUtil } from '@alicloud/openapi-core';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import { ObjectStorage } from '@/storage/object-storage.interface';
import { OBJECT_STORAGE } from '@/storage/object-storage.interface';
import {
  FileScannerProvider,
  FileScanInput,
  FileScanResult,
} from './file-scanner.types';

const MAX_ALIYUN_SCAN_BYTES = 100n * 1024n * 1024n;

@Injectable()
export class AliyunFileScannerService implements FileScannerProvider {
  constructor(
    private readonly systemConfig: SystemConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async scan(input: FileScanInput): Promise<FileScanResult> {
    if (input.sizeBytes > MAX_ALIYUN_SCAN_BYTES) {
      throw new ServiceUnavailableException(
        '文件超过阿里云 SDK 100 MiB 扫描上限',
      );
    }
    if (!input.checksumSha256 || !/^[a-f0-9]{64}$/.test(input.checksumSha256)) {
      throw new ServiceUnavailableException('阿里云扫描缺少文件 SHA-256');
    }
    const config = await this.getConfig();
    const client = this.createClient(config.regionId);
    const downloadUrl = this.storage.getDownloadUrl({
      key: input.objectKey,
      fileName: input.fileName,
      contentType: input.contentType,
      expiresSeconds: Math.max(900, Math.ceil(config.timeoutMs / 1000) + 300),
    });
    const submitted = await client.createFileDetect(
      new $Sas20181203.CreateFileDetectRequest({
        type: 0,
        hashKey: input.checksumSha256,
        downloadUrl,
        decompress: false,
      }),
    );
    const hashKey = submitted.body?.hashKey ?? input.checksumSha256;
    const deadline = Date.now() + config.timeoutMs;

    while (Date.now() < deadline) {
      const response = await client.getFileDetectResult(
        new $Sas20181203.GetFileDetectResultRequest({
          type: 0,
          hashKeyList: [hashKey],
        }),
      );
      const result = response.body?.resultList?.find(
        (item) => item.hashKey === hashKey,
      );
      if (result && result.code && result.code !== '200') {
        throw new ServiceUnavailableException(
          `阿里云扫描失败（${result.code}）`,
        );
      }
      if (result?.result === 0 || result?.result === 1) {
        return {
          clean: result.result === 0,
          checksumSha256: input.checksumSha256,
          details: {
            engine: 'aliyun-sas',
            requestId: response.body?.requestId,
            hashKey,
            result: result.result,
            score: result.score,
            virusType: result.virusType,
            message: result.message,
          },
        };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, config.pollIntervalMs),
      );
    }
    throw new ServiceUnavailableException('阿里云病毒扫描超时');
  }

  private createClient(regionId: string): Sas20181203 {
    const credential = new Credential();
    return new Sas20181203(
      new $OpenApiUtil.Config({
        credential,
        regionId,
        protocol: 'https',
      }),
    );
  }

  private async getConfig() {
    const raw = (await this.systemConfig.getConfig('drive')) as
      | { value?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    const config = (raw?.value ?? raw ?? {}) as {
      aliyunSasRegionId?: string;
      scanTimeoutMs?: number;
      scanPollIntervalMs?: number;
    };
    const configuredRegion =
      config.aliyunSasRegionId?.trim() ||
      process.env.ALIYUN_OSS_REGION?.trim() ||
      'cn-hangzhou';
    return {
      regionId: configuredRegion.replace(/^oss-/, ''),
      timeoutMs: config.scanTimeoutMs ?? 5 * 60 * 1000,
      pollIntervalMs: config.scanPollIntervalMs ?? 3000,
    };
  }
}
