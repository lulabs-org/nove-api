import { randomInt, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { OrderRepository } from '../repositories';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;
const ORDER_CODE_RANDOM_SUFFIX_MAX = 1_000_000;

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  /**
   * 飞书集成平台已经把微信小店原始字段转换成内部字段。
   * 这里仅按外部订单号做幂等写入：存在则更新，不存在则创建。
   */
  async upsertWechatOrder(payload: WechatOrderWebhookDto) {
    const existingOrder = await this.orderRepository.findLatestByExternalId(
      payload.orderId,
    );

    if (existingOrder) {
      const order = await this.orderRepository.update(
        existingOrder.id,
        this.buildUpdateData(payload),
      );

      return { action: 'updated' as const, order };
    }

    const orderCode = this.generateOrderCode();
    const order = await this.orderRepository.create(
      this.buildCreateData(payload, orderCode),
    );

    return { action: 'created' as const, order };
  }

  /**
   * 创建订单时补齐系统生成的订单号、默认币种和必填金额。
   */
  private buildCreateData(
    payload: WechatOrderWebhookDto,
    orderCode: string,
  ): Prisma.OrderUncheckedCreateInput {
    return this.assignOptionalFields(
      {
        orderCode,
        orderNumber: this.encodeOrderNumber(orderCode),
        amount: payload.amount ?? 0,
        currency: Currency.CNY,
        externalId: payload.orderId,
        metadata: (payload.metadata ?? payload) as Prisma.InputJsonValue,
      },
      payload,
    );
  }

  /**
   * 更新订单时只同步外部平台字段，不重新生成订单号。
   */
  private buildUpdateData(
    payload: WechatOrderWebhookDto,
  ): Prisma.OrderUncheckedUpdateInput {
    return this.assignOptionalFields(
      {
        externalId: payload.orderId,
        metadata: (payload.metadata ?? payload) as Prisma.InputJsonValue,
      },
      payload,
    );
  }

  /**
   * create/update 共用的可选字段赋值逻辑。
   * 只写入有值字段，避免外部空字段覆盖已有订单信息。
   */
  private assignOptionalFields<
    T extends
      | Prisma.OrderUncheckedCreateInput
      | Prisma.OrderUncheckedUpdateInput,
  >(data: T, payload: WechatOrderWebhookDto): T {
    if (payload.status) data.status = payload.status;
    if (payload.paidAt) data.paidAt = new Date(payload.paidAt);
    if (payload.amount !== undefined) data.amount = payload.amount;
    if (payload.paymentProvider) data.paymentProvider = payload.paymentProvider;
    if (payload.providerTradeNo) data.providerTradeNo = payload.providerTradeNo;
    if (payload.productId) data.productId = payload.productId;
    if (payload.productName) data.productName = payload.productName;
    if (payload.phone) data.phone = payload.phone;

    return data;
  }

  /**
   * 生成内部订单号：时间戳 + 随机后缀，避免依赖数据库序列。
   */
  private generateOrderCode(): string {
    const timestamp = Date.now().toString();
    const randomSuffix = randomInt(ORDER_CODE_RANDOM_SUFFIX_MAX)
      .toString()
      .padStart(6, '0');

    return `${timestamp}${randomSuffix}`;
  }

  /**
   * 对外展示订单号由内部订单号编码得到，避免直接暴露连续数字。
   */
  private encodeOrderNumber(orderCode: string): string {
    try {
      const encoded = BigInt(orderCode) ^ ORDER_NUMBER_MASK;

      return encoded.toString(36).toUpperCase();
    } catch (err) {
      // Fallback: stable hash-based encoding when orderCode is not a valid integer
      const hash = createHash('sha256').update(String(orderCode)).digest('hex');
      // take a prefix of the hex hash and convert to BigInt for base36 encoding
      const prefix = hash.slice(0, 12); // 12 hex chars -> up to 48 bits
      const safeBigInt = BigInt('0x' + prefix);

      return safeBigInt.toString(36).toUpperCase();
    }
  }
}
