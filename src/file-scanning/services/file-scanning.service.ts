import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FileScanProvider } from '@prisma/client';
import { FileScanningConfigService } from './file-scanning-config.service';
import {
  AliyunFileScannerService,
  ClamAvFileScannerService,
} from '../providers';
import { FileScanInput, FileScanResult } from '../types';

@Injectable()
export class FileScanningService {
  constructor(
    private readonly scanningConfig: FileScanningConfigService,
    private readonly aliyun: AliyunFileScannerService,
    private readonly clamAv: ClamAvFileScannerService,
  ) {}

  /**
   * 解析当前系统/租户生效的扫描引擎类型。
   * 完全依赖数据库集成配置（file-scanning 优先，兜底 drive），无隐式环境变量猜测。
   */
  async resolveEffectiveProvider(): Promise<FileScanProvider | null> {
    const config = await this.scanningConfig.getConfig();
    if (
      config.malwareScanProvider === FileScanProvider.ALIYUN_SAS ||
      config.malwareScanProvider === FileScanProvider.CLAMAV
    ) {
      return config.malwareScanProvider;
    }

    if (config.clamAvHost?.trim()) {
      return FileScanProvider.CLAMAV;
    }

    return null;
  }

  /**
   * 统一文件扫描入口
   */
  async scan(
    input: FileScanInput,
    options?: { provider?: FileScanProvider },
  ): Promise<FileScanResult> {
    const provider =
      options?.provider ?? (await this.resolveEffectiveProvider());

    if (!provider || provider === FileScanProvider.POLICY_BYPASS) {
      return {
        clean: true,
        checksumSha256: input.checksumSha256 ?? undefined,
        details: { engine: 'bypass' },
      };
    }

    switch (provider) {
      case FileScanProvider.ALIYUN_SAS:
        return this.aliyun.scan(input);
      case FileScanProvider.CLAMAV:
        return this.clamAv.scan(input);
      default:
        throw new ServiceUnavailableException(
          `不支持的文件扫描提供商: ${provider}`,
        );
    }
  }
}
