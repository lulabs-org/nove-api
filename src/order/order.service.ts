import { Injectable } from '@nestjs/common';
import { Currency, OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;
const DATABASE_RETRY_ATTEMPTS = 3;
const DATABASE_RETRY_DELAY_MS = 300;

type NormalizedOrderPayload = {
  externalId: string;
  status?: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
  paidAt?: Date;
  amount?: number;
  paymentProvider?: PaymentProvider;
  providerTradeNo?: string;
  productId?: string;
  productName?: string;
  phone?: string;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertWechatOrder(payload: WechatOrderWebhookDto) {
    return this.withDatabaseRetry(async () => {
      const normalized = await this.normalizePayload(payload);
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          externalId: normalized.externalId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingOrder) {
        const order = await this.prisma.order.update({
          where: { id: existingOrder.id },
          data: this.buildUpdateData(normalized),
        });

        return {
          action: 'updated' as const,
          order,
        };
      }

      const orderCode = await this.generateOrderCode();
      const orderNumber = this.encodeOrderNumber(orderCode);
      const order = await this.prisma.order.create({
        data: this.buildCreateData(normalized, orderCode, orderNumber),
      });

      return {
        action: 'created' as const,
        order,
      };
    });
  }

  private async normalizePayload(
    payload: WechatOrderWebhookDto,
  ): Promise<NormalizedOrderPayload> {
    const orderDetail = payload.order_detail;
    const productInfos = orderDetail?.product_infos ?? payload.product_infos;
    const payInfo = orderDetail?.pay_info ?? payload.pay_info;
    const priceInfo = orderDetail?.price_info ?? payload.price_info;
    const deliveryInfo = orderDetail?.delivery_info ?? payload.delivery_info;
    const firstProduct = productInfos?.[0];
    const telNumber =
      deliveryInfo?.address_info?.tel_number ??
      deliveryInfo?.address_info?.use_tel_number;
    const productId = await this.resolveProductId(firstProduct?.product_id);

    return {
      externalId: payload.order_id,
      status: this.mapOrderStatus(payload.status),
      createdAt: this.parseDate(payload.create_time),
      updatedAt: this.parseDate(payload.update_time),
      paidAt: this.parseDate(payInfo?.pay_time),
      amount: this.parseInteger(priceInfo?.order_price),
      paymentProvider: this.mapPaymentProvider(payInfo?.payment_method),
      providerTradeNo: payInfo?.transaction_id,
      productId,
      productName: firstProduct?.title,
      phone: telNumber,
      metadata: payload as unknown as Prisma.InputJsonValue,
    };
  }

  private buildUpdateData(
    payload: NormalizedOrderPayload,
  ): Prisma.OrderUncheckedUpdateInput {
    const data: Prisma.OrderUncheckedUpdateInput = {
      externalId: payload.externalId,
      metadata: payload.metadata,
    };

    if (payload.status) {
      data.status = payload.status;
    }

    if (payload.createdAt) {
      data.createdAt = payload.createdAt;
    }

    if (payload.updatedAt) {
      data.updatedAt = payload.updatedAt;
    }

    if (payload.paidAt) {
      data.paidAt = payload.paidAt;
    }

    if (payload.amount !== undefined) {
      data.amount = payload.amount;
    }

    if (payload.paymentProvider) {
      data.paymentProvider = payload.paymentProvider;
    }

    if (payload.providerTradeNo) {
      data.providerTradeNo = payload.providerTradeNo;
    }

    if (payload.productId) {
      data.productId = payload.productId;
    }

    if (payload.productName) {
      data.productName = payload.productName;
    }

    if (payload.phone) {
      data.phone = payload.phone;
    }

    return data;
  }

  private buildCreateData(
    payload: NormalizedOrderPayload,
    orderCode: string,
    orderNumber: string,
  ): Prisma.OrderUncheckedCreateInput {
    const data: Prisma.OrderUncheckedCreateInput = {
      orderCode,
      orderNumber,
      amount: payload.amount ?? 0,
      currency: Currency.CNY,
      externalId: payload.externalId,
      metadata: payload.metadata,
    };

    if (payload.status) {
      data.status = payload.status;
    }

    if (payload.createdAt) {
      data.createdAt = payload.createdAt;
    }

    if (payload.updatedAt) {
      data.updatedAt = payload.updatedAt;
    }

    if (payload.paidAt) {
      data.paidAt = payload.paidAt;
    }

    if (payload.paymentProvider) {
      data.paymentProvider = payload.paymentProvider;
    }

    if (payload.providerTradeNo) {
      data.providerTradeNo = payload.providerTradeNo;
    }

    if (payload.productId) {
      data.productId = payload.productId;
    }

    if (payload.productName) {
      data.productName = payload.productName;
    }

    if (payload.phone) {
      data.phone = payload.phone;
    }

    return data;
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
      const timestamp = value.length <= 10 ? numericValue * 1000 : numericValue;
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private mapOrderStatus(value?: string): OrderStatus | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();

    const statusMap: Record<string, OrderStatus> = {
      UNPAID: OrderStatus.UNPAID,
      PENDING_PAYMENT: OrderStatus.UNPAID,
      TO_BE_PAID: OrderStatus.UNPAID,
      WAIT_BUYER_PAY: OrderStatus.UNPAID,
      PAID: OrderStatus.PAID,
      TO_BE_DELIVERED: OrderStatus.PAID,
      TO_BE_RECEIVED: OrderStatus.PAID,
      DELIVERED: OrderStatus.PAID,
      CANCELLED: OrderStatus.CANCELLED,
      CANCELED: OrderStatus.CANCELLED,
      CLOSED: OrderStatus.CANCELLED,
      REFUNDED: OrderStatus.REFUNDED,
      COMPLETED: OrderStatus.COMPLETED,
      FINISHED: OrderStatus.COMPLETED,
      CONFIRMED: OrderStatus.COMPLETED,
      未支付: OrderStatus.UNPAID,
      待支付: OrderStatus.UNPAID,
      已支付: OrderStatus.PAID,
      礼物待收下: OrderStatus.PAID,
      一起买待成团: OrderStatus.PAID,
      待发货: OrderStatus.PAID,
      部分发货: OrderStatus.PAID,
      待收货: OrderStatus.PAID,
      已取消: OrderStatus.CANCELLED,
      已退款: OrderStatus.REFUNDED,
      已完成: OrderStatus.COMPLETED,
      '10': OrderStatus.UNPAID,
      '12': OrderStatus.PAID,
      '13': OrderStatus.PAID,
      '20': OrderStatus.PAID,
      '21': OrderStatus.PAID,
      '30': OrderStatus.PAID,
      '100': OrderStatus.COMPLETED,
      '200': OrderStatus.REFUNDED,
      '250': OrderStatus.CANCELLED,
    };

    return statusMap[normalized] ?? statusMap[value.trim()];
  }

  private mapPaymentProvider(value?: string): PaymentProvider | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();

    const providerMap: Record<string, PaymentProvider> = {
      '1': PaymentProvider.WECHAT,
      '2': PaymentProvider.OTHER,
      '3': PaymentProvider.OTHER,
      '4': PaymentProvider.OTHER,
      WECHAT: PaymentProvider.WECHAT,
      WECHAT_PAY: PaymentProvider.WECHAT,
      WX: PaymentProvider.WECHAT,
      微信支付: PaymentProvider.WECHAT,
      ALIPAY: PaymentProvider.ALIPAY,
      支付宝: PaymentProvider.ALIPAY,
      PAYPAL: PaymentProvider.PAYPAL,
      STRIPE: PaymentProvider.STRIPE,
      APPLE_PAY: PaymentProvider.APPLE_PAY,
      GOOGLE_PAY: PaymentProvider.GOOGLE_PAY,
      OTHER: PaymentProvider.OTHER,
    };

    return (
      providerMap[normalized] ??
      providerMap[value.trim()] ??
      PaymentProvider.OTHER
    );
  }

  private parseInteger(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return undefined;
    }

    return numericValue;
  }

  private async resolveProductId(
    productId?: string,
  ): Promise<string | undefined> {
    if (!productId) {
      return undefined;
    }

    try {
      const existingProduct = await this.withDatabaseRetry(() =>
        this.prisma.product.findUnique({
          where: { id: productId },
          select: { id: true },
        }),
      );

      return existingProduct?.id;
    } catch (error) {
      if (this.isRetryableDatabaseError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  private async generateOrderCode(): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ nextval: bigint }>>`
      SELECT nextval('orders_order_code_seq') AS nextval
    `;
    const nextValue = rows[0]?.nextval;

    if (typeof nextValue !== 'bigint') {
      throw new Error('Failed to allocate internal order code');
    }

    return nextValue.toString();
  }

  private encodeOrderNumber(orderCode: string): string {
    const internalId = BigInt(orderCode);
    const encoded = internalId ^ ORDER_NUMBER_MASK;

    return encoded.toString(36).toUpperCase();
  }

  private async withDatabaseRetry<T>(
    operation: () => Promise<T>,
    attempts = DATABASE_RETRY_ATTEMPTS,
    delayMs = DATABASE_RETRY_DELAY_MS,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isRetryableDatabaseError(error) || attempt === attempts) {
          throw error;
        }

        await this.delay(delayMs * attempt);
      }
    }

    throw lastError;
  }

  private isRetryableDatabaseError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P1001'
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
