import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, OrderStatus, Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  OrderDto,
  OrderListResponse,
  OrderRelationDto,
  QueryOrderDto,
  UpdateOrderDto,
} from '../dto';
import {
  OrderRepository,
  OrderWithRelations,
} from '../repositories/order.repository';

const SORT_FIELD_MAP: Record<
  string,
  keyof Prisma.OrderOrderByWithRelationInput
> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paidAt: 'paidAt',
  amount: 'amount',
  status: 'status',
  orderCode: 'orderCode',
  orderNumber: 'orderNumber',
  financialClosedAt: 'financialClosedAt',
};

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async create(dto: CreateOrderDto): Promise<OrderDto> {
    const { orderCode, orderNumber } = await this.resolveOrderNumbers(dto);

    await this.ensureOrderNumberAvailable(orderCode, orderNumber);
    await this.ensureExternalIdAvailable(dto.channelId, dto.externalId);
    await this.ensureRelationsExist(dto);

    const productName = await this.resolveProductName(
      dto.productId,
      dto.productName,
    );

    const order = await this.orderRepository.create({
      orderCode,
      orderNumber,
      externalId: this.trimNullable(dto.externalId),
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      productName,
      email: this.trimNullable(dto.email),
      phone: this.trimNullable(dto.phone),
      phoneCode: this.trimNullable(dto.phoneCode),
      financialClosedAt: this.toDate(dto.financialClosedAt),
      amount: dto.amount,
      currency: dto.currency ?? Currency.CNY,
      amountCny: dto.amountCny,
      fxRateToCny: dto.fxRateToCny,
      fxLockedAt: this.toDate(dto.fxLockedAt),
      status: dto.status ?? OrderStatus.UNPAID,
      paidAt: this.toDate(dto.paidAt),
      cancelledAt: this.toDate(dto.cancelledAt),
      completedAt: this.toDate(dto.completedAt),
      benefitStart: this.toDate(dto.benefitStart),
      benefitEnd: this.toDate(dto.benefitEnd),
      paymentProvider: dto.paymentProvider,
      providerTradeNo: this.trimNullable(dto.providerTradeNo),
      product: dto.productId ? { connect: { id: dto.productId } } : undefined,
      purchaser: dto.purchaserId
        ? { connect: { id: dto.purchaserId } }
        : undefined,
      channel:
        dto.channelId !== undefined
          ? { connect: { id: dto.channelId } }
          : undefined,
      currentOwner: dto.currentOwnerId
        ? { connect: { id: dto.currentOwnerId } }
        : undefined,
      financialCloser: dto.financialCloserId
        ? { connect: { id: dto.financialCloserId } }
        : undefined,
    });

    return this.toDto(order);
  }

  async findAll(query: QueryOrderDto): Promise<OrderListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const { items, total } = await this.orderRepository.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
    });

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<OrderDto> {
    const order = await this.findActiveOrder(id);
    return this.toDto(order);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderDto> {
    const existing = await this.findActiveOrder(id);

    if (dto.orderCode && dto.orderCode !== existing.orderCode) {
      const order = await this.orderRepository.findByOrderCode(dto.orderCode);
      if (order) {
        throw new BadRequestException('Order code already exists');
      }
    }

    if (dto.orderNumber && dto.orderNumber !== existing.orderNumber) {
      const order = await this.orderRepository.findByOrderNumber(
        dto.orderNumber,
      );
      if (order) {
        throw new BadRequestException('Order number already exists');
      }
    }

    const nextChannelId =
      dto.channelId !== undefined ? dto.channelId : existing.channelId;
    const nextExternalId =
      dto.externalId !== undefined ? dto.externalId : existing.externalId;

    if (
      nextChannelId !== null &&
      nextExternalId &&
      (nextChannelId !== existing.channelId ||
        nextExternalId !== existing.externalId)
    ) {
      await this.ensureExternalIdAvailable(nextChannelId, nextExternalId, id);
    }

    await this.ensureRelationsExist(dto);

    const productName =
      dto.productId !== undefined || dto.productName !== undefined
        ? await this.resolveProductName(dto.productId, dto.productName)
        : undefined;

    const order = await this.orderRepository.update(id, {
      orderCode: this.trimNullable(dto.orderCode),
      orderNumber: this.trimNullable(dto.orderNumber),
      externalId: this.trimNullable(dto.externalId),
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      productName,
      email: this.trimNullable(dto.email),
      phone: this.trimNullable(dto.phone),
      phoneCode: this.trimNullable(dto.phoneCode),
      financialClosedAt: this.toDate(dto.financialClosedAt),
      amount: dto.amount,
      currency: dto.currency,
      amountCny: dto.amountCny,
      fxRateToCny: dto.fxRateToCny,
      fxLockedAt: this.toDate(dto.fxLockedAt),
      status: dto.status,
      paidAt: this.toDate(dto.paidAt),
      cancelledAt: this.toDate(dto.cancelledAt),
      completedAt: this.toDate(dto.completedAt),
      benefitStart: this.toDate(dto.benefitStart),
      benefitEnd: this.toDate(dto.benefitEnd),
      paymentProvider: dto.paymentProvider,
      providerTradeNo: this.trimNullable(dto.providerTradeNo),
      product:
        dto.productId === undefined
          ? undefined
          : dto.productId
            ? { connect: { id: dto.productId } }
            : { disconnect: true },
      purchaser:
        dto.purchaserId === undefined
          ? undefined
          : dto.purchaserId
            ? { connect: { id: dto.purchaserId } }
            : { disconnect: true },
      channel:
        dto.channelId === undefined
          ? undefined
          : dto.channelId
            ? { connect: { id: dto.channelId } }
            : { disconnect: true },
      currentOwner:
        dto.currentOwnerId === undefined
          ? undefined
          : dto.currentOwnerId
            ? { connect: { id: dto.currentOwnerId } }
            : { disconnect: true },
      financialCloser:
        dto.financialCloserId === undefined
          ? undefined
          : dto.financialCloserId
            ? { connect: { id: dto.financialCloserId } }
            : { disconnect: true },
    });

    return this.toDto(order);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderDto> {
    await this.findActiveOrder(id);
    const order = await this.orderRepository.update(id, { status });
    return this.toDto(order);
  }

  async delete(id: string): Promise<void> {
    await this.findActiveOrder(id);
    await this.orderRepository.softDelete(id);
  }

  private async findActiveOrder(id: string): Promise<OrderWithRelations> {
    const order = await this.orderRepository.findById(id);
    if (!order || order.deletedAt) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private async resolveOrderNumbers(dto: CreateOrderDto) {
    const inputOrderCode = dto.orderCode?.trim();
    const inputOrderNumber = dto.orderNumber?.trim();

    if (inputOrderCode && inputOrderNumber) {
      return { orderCode: inputOrderCode, orderNumber: inputOrderNumber };
    }

    for (let index = 0; index < 5; index += 1) {
      const orderCode = inputOrderCode || this.generateOrderCode();
      const orderNumber = inputOrderNumber || this.generateOrderNumber();
      const codeExists = await this.orderRepository.findByOrderCode(orderCode);
      const numberExists =
        await this.orderRepository.findByOrderNumber(orderNumber);

      if (!codeExists && !numberExists) {
        return { orderCode, orderNumber };
      }
    }

    throw new BadRequestException('Unable to generate unique order numbers');
  }

  private async ensureOrderNumberAvailable(
    orderCode: string,
    orderNumber: string,
  ) {
    const existingCode = await this.orderRepository.findByOrderCode(orderCode);
    if (existingCode) {
      throw new BadRequestException('Order code already exists');
    }

    const existingNumber =
      await this.orderRepository.findByOrderNumber(orderNumber);
    if (existingNumber) {
      throw new BadRequestException('Order number already exists');
    }
  }

  private async ensureExternalIdAvailable(
    channelId?: number | null,
    externalId?: string | null,
    excludeOrderId?: string,
  ) {
    if (!channelId || !externalId) return;

    const order = await this.orderRepository.findByChannelIdAndExternalId(
      channelId,
      externalId,
    );

    if (order && order.id !== excludeOrderId) {
      throw new BadRequestException(
        'External order id already exists in this channel',
      );
    }
  }

  private async ensureRelationsExist(dto: Partial<CreateOrderDto>) {
    if (dto.productId) {
      const exists = await this.orderRepository.productExists(dto.productId);
      if (!exists) throw new NotFoundException('Product not found');
    }

    if (dto.channelId !== undefined && dto.channelId !== null) {
      const exists = await this.orderRepository.channelExists(dto.channelId);
      if (!exists) throw new NotFoundException('Channel not found');
    }

    await this.ensureUserExists(dto.purchaserId, 'Purchaser not found');
    await this.ensureUserExists(dto.currentOwnerId, 'Current owner not found');
    await this.ensureUserExists(
      dto.financialCloserId,
      'Financial closer not found',
    );
  }

  private async ensureUserExists(userId: string | undefined, message: string) {
    if (!userId) return;
    const exists = await this.orderRepository.userExists(userId);
    if (!exists) throw new NotFoundException(message);
  }

  private async resolveProductName(
    productId?: string,
    productName?: string,
  ): Promise<string | undefined> {
    const trimmedName = productName?.trim();
    if (trimmedName) return trimmedName;
    if (!productId) return undefined;

    const product = await this.orderRepository.findProductById(productId);
    return product?.name;
  }

  private buildWhere(query: QueryOrderDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [
        { orderCode: { contains: keyword, mode: 'insensitive' } },
        { orderNumber: { contains: keyword, mode: 'insensitive' } },
        { externalId: { contains: keyword, mode: 'insensitive' } },
        { productName: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword, mode: 'insensitive' } },
        { providerTradeNo: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.currency) where.currency = query.currency;
    if (query.paymentProvider) where.paymentProvider = query.paymentProvider;
    if (query.channelId !== undefined) where.channelId = query.channelId;
    if (query.productId) where.productId = query.productId;
    if (query.purchaserId) where.purchaserId = query.purchaserId;
    if (query.currentOwnerId) where.currentOwnerId = query.currentOwnerId;

    if (query.paidFrom || query.paidTo) {
      where.paidAt = {
        gte: query.paidFrom ? new Date(query.paidFrom) : undefined,
        lte: query.paidTo ? new Date(query.paidTo) : undefined,
      };
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        gte: query.createdFrom ? new Date(query.createdFrom) : undefined,
        lte: query.createdTo ? new Date(query.createdTo) : undefined,
      };
    }

    return where;
  }

  private buildOrderBy(
    query: QueryOrderDto,
  ): Prisma.OrderOrderByWithRelationInput {
    const sortField = query.sortField
      ? SORT_FIELD_MAP[query.sortField]
      : undefined;
    const direction =
      query.sortOrder === 'ascend' || query.sortOrder === 'asc'
        ? 'asc'
        : 'desc';

    return sortField ? { [sortField]: direction } : { createdAt: 'desc' };
  }

  private trimNullable(value?: string | null): string | undefined {
    if (value === undefined || value === null) return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private toDate(value?: string | null): Date | undefined {
    if (!value) return undefined;
    return new Date(value);
  }

  private generateOrderCode(): string {
    return `ORD${this.timestamp()}${this.randomSuffix()}`;
  }

  private generateOrderNumber(): string {
    return `${this.timestamp()}${this.randomSuffix()}`;
  }

  private timestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');
  }

  private randomSuffix(): string {
    return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }

  private toDto(order: OrderWithRelations): OrderDto {
    return {
      id: order.id,
      orderCode: order.orderCode,
      orderNumber: order.orderNumber,
      externalId: order.externalId,
      metadata: order.metadata,
      productId: order.productId,
      productName: order.productName,
      purchaserId: order.purchaserId,
      channelId: order.channelId,
      email: order.email,
      phone: order.phone,
      phoneCode: order.phoneCode,
      currentOwnerId: order.currentOwnerId,
      financialCloserId: order.financialCloserId,
      financialClosedAt: order.financialClosedAt,
      amount: order.amount,
      currency: order.currency,
      amountCny: order.amountCny,
      fxRateToCny: order.fxRateToCny?.toString() ?? null,
      fxLockedAt: order.fxLockedAt,
      status: order.status,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      benefitStart: order.benefitStart,
      benefitEnd: order.benefitEnd,
      paymentProvider: order.paymentProvider,
      providerTradeNo: order.providerTradeNo,
      product: order.product
        ? {
            id: order.product.id,
            code: order.product.productCode,
            name: order.product.name,
          }
        : null,
      purchaser: this.toUserRelation(order.purchaser),
      channel: order.channel
        ? {
            id: order.channel.id,
            code: order.channel.code,
            name: order.channel.name,
          }
        : null,
      currentOwner: this.toUserRelation(order.currentOwner),
      financialCloser: this.toUserRelation(order.financialCloser),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deletedAt: order.deletedAt,
    };
  }

  private toUserRelation(
    user: OrderWithRelations['purchaser'],
  ): OrderRelationDto | null {
    if (!user) return null;

    return {
      id: user.id,
      code: user.username,
      name: user.profile?.displayName || user.username || user.email,
      email: user.email,
    };
  }
}
