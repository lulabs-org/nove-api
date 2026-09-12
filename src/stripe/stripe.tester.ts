import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import Stripe from 'stripe';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class StripeTesterService
  implements IntegrationTestProvider, OnModuleInit
{
  private readonly logger = new Logger(StripeTesterService.name);

  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('stripe', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const secretKey = String(value.secretKey || '').trim();
    if (!secretKey) {
      throw new BadRequestException('Stripe Secret Key is required');
    }

    const stripe = new Stripe(secretKey, { timeout: 10000 });

    try {
      // 优先获取商户自身的账号详情（GET /v1/account），验证身份与连通性
      const account = await stripe.accounts.retrieve();
      this.logger.log(
        `Stripe 连接测试成功，识别商户账号: ${account.id} (${account.business_profile?.name || account.email || '已连接'})`,
      );
    } catch (error: unknown) {
      const err = error as { statusCode?: number; code?: string };

      // 核心容错：若返回 403 (more_permissions_required)，说明已通过 Stripe 官方身份认证
      // 证实 Key 真实有效且网络畅通，无需强迫管理员在 Stripe 控制台额外开启 Account 权限！
      if (
        err?.statusCode === 403 ||
        err?.code === 'more_permissions_required'
      ) {
        this.logger.log(
          'Stripe 密钥连通性与身份鉴权通过（受限密钥模式，无 Account 权限）',
        );
        return;
      }

      this.logger.error('Stripe 连接测试失败:', error);
      throw error;
    }
  }
}
