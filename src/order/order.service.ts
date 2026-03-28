import { Injectable } from '@nestjs/common';
import { Currency, OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';

type NormalizedOrderPayload = {
  externalId: string;
  status?: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
  paidAt?: Date;
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

    const orderCode = await this.generateUniqueOrderCode();
    const orderNumber = await this.generateUniqueOrderNumber();
    const order = await this.prisma.order.create({
      data: this.buildCreateData(normalized, orderCode, orderNumber),
    });

    return {
      action: 'created' as const,
      order,
    };
  }

  private async normalizePayload(
    payload: WechatOrderWebhookDto,
  ): Promise<NormalizedOrderPayload> {
    const firstProduct = payload.product_infos?.[0];
    const telNumber =
      payload.delivery_info?.address_info?.tel_number ??
      payload.delivery_info?.address_info?.use_tel_number;
    const productId = await this.resolveProductId(firstProduct?.product_id);

    return {
      externalId: payload.order_id,
      status: this.mapOrderStatus(payload.status),
      createdAt: this.parseDate(payload.create_time),
      updatedAt: this.parseDate(payload.update_time),
      paidAt: this.parseDate(payload.pay_info?.pay_time),
      paymentProvider: this.mapPaymentProvider(payload.pay_info?.payment_method),
      providerTradeNo: payload.pay_info?.transaction_id,
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
      amount: 0,
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
      '未支付': OrderStatus.UNPAID,
      '待支付': OrderStatus.UNPAID,
      '已支付': OrderStatus.PAID,
      '待发货': OrderStatus.PAID,
      '待收货': OrderStatus.PAID,
      '已取消': OrderStatus.CANCELLED,
      '已退款': OrderStatus.REFUNDED,
      '已完成': OrderStatus.COMPLETED,
    };

    return statusMap[normalized] ?? statusMap[value.trim()];
  }

  private mapPaymentProvider(value?: string): PaymentProvider | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();

    const providerMap: Record<string, PaymentProvider> = {
      WECHAT: PaymentProvider.WECHAT,
      WECHAT_PAY: PaymentProvider.WECHAT,
      WX: PaymentProvider.WECHAT,
      '微信支付': PaymentProvider.WECHAT,
      ALIPAY: PaymentProvider.ALIPAY,
      '支付宝': PaymentProvider.ALIPAY,
      PAYPAL: PaymentProvider.PAYPAL,
      STRIPE: PaymentProvider.STRIPE,
      APPLE_PAY: PaymentProvider.APPLE_PAY,
      GOOGLE_PAY: PaymentProvider.GOOGLE_PAY,
      OTHER: PaymentProvider.OTHER,
    };

    return providerMap[normalized] ?? providerMap[value.trim()] ?? PaymentProvider.OTHER;
  }

  private async resolveProductId(
    productId?: string,
  ): Promise<string | undefined> {
    if (!productId) {
      return undefined;
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    return existingProduct?.id;
  }

  private async generateUniqueOrderCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `ORD${this.formatNow()}${this.randomDigits(4)}`;
      const existing = await this.prisma.order.findUnique({
        where: { orderCode: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Failed to generate unique order code');
  }

  private async generateUniqueOrderNumber(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `${this.formatNow()}${this.randomDigits(4)}`;
      const existing = await this.prisma.order.findUnique({
        where: { orderNumber: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Failed to generate unique order number');
  }

  private formatNow() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`;
  }

  private randomDigits(length: number) {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
  }
}
