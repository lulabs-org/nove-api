import { BadRequestException, Injectable } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigValues, ConfigTestProvider } from '../core';

export interface TestResult {
  orgId: string;
  success: boolean;
  message: string;
}

@Injectable()
export class TesterService {
  private readonly providers = new Map<string, ConfigTestProvider>();

  constructor(private readonly systemConfigService: SystemConfigService) {}

  registerProvider(module: string, provider: ConfigTestProvider): void {
    this.providers.set(module, provider);
  }

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
    const provider = this.providers.get(module);
    if (!provider) {
      throw new BadRequestException('不支持测试该配置模块');
    }
    return provider.test(value);
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

