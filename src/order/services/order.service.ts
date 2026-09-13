import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BenefitAdjustmentType,
  Currency,
  OrderStatus,
  Prisma,
} from '@/generated/prisma/client';
import {
  CreateOrderDto,
  ExtendOrderDto,
  FreezeOrderDto,
  OrderBenefitAdjustmentDto,
  OrderDto,
  OrderListResponse,
  OrderRelationDto,
  QueryOrderDto,
  UnfreezeOrderDto,
  UpdateOrderDto,
} from '../dto';
import {
  OrderBenefitAdjustmentWithOperator,
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
  settledAt: 'settledAt',
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
    const durationDays = await this.resolveDurationDays(
      dto.productId,
      dto.durationDays,
    );

    const benefitStart = this.toDate(dto.benefitStart);
    let benefitEnd = this.toDate(dto.benefitEnd);
    if (benefitStart && !benefitEnd && durationDays) {
      benefitEnd = new Date(
        benefitStart.getTime() + durationDays * 24 * 60 * 60 * 1000,
      );
    }

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
      durationDays,
      benefitStart,
      benefitEnd,
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
      durationDays: dto.durationDays,
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

  async freeze(
    id: string,
    dto: FreezeOrderDto,
    operatorId?: string,
  ): Promise<OrderDto> {
    const order = await this.findActiveOrder(id);

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Only paid orders can be frozen (current status: ${order.status})`,
      );
    }

    const now = new Date();
    if (!order.benefitEnd || order.benefitEnd <= now) {
      throw new BadRequestException(
        'Cannot freeze an order without benefit end date or that is already expired',
      );
    }

    if (operatorId) {
      await this.ensureUserExists(operatorId, 'Operator not found');
    }

    const result = await this.orderRepository.executeBenefitAdjustment({
      orderId: id,
      orderUpdate: {
        status: OrderStatus.FROZEN,
        frozenAt: now,
      },
      adjustmentCreate: {
        order: { connect: { id } },
        type: BenefitAdjustmentType.FREEZE,
        days: 0,
        freezeStart: now,
        beforeEnd: order.benefitEnd,
        afterEnd: order.benefitEnd,
        reason: this.trimNullable(dto.reason),
        operator: operatorId ? { connect: { id: operatorId } } : undefined,
      },
    });

    return this.toDto(result.order);
  }

  async unfreeze(
    id: string,
    dto: UnfreezeOrderDto,
    operatorId?: string,
  ): Promise<OrderDto> {
    const order = await this.findActiveOrder(id);

    if (order.status !== OrderStatus.FROZEN || !order.frozenAt) {
      throw new BadRequestException(
        `Only frozen orders can be unfrozen (current status: ${order.status})`,
      );
    }

    if (operatorId) {
      await this.ensureUserExists(operatorId, 'Operator not found');
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const actualFrozenDays = Math.max(
      1,
      Math.ceil((now.getTime() - order.frozenAt.getTime()) / msPerDay),
    );

    const currentEnd = order.benefitEnd ? new Date(order.benefitEnd) : now;
    const newBenefitEnd = new Date(
      currentEnd.getTime() + actualFrozenDays * msPerDay,
    );
    const totalFrozenDays = (order.frozenDays || 0) + actualFrozenDays;

    const result = await this.orderRepository.executeBenefitAdjustment({
      orderId: id,
      orderUpdate: {
        status: OrderStatus.PAID,
        frozenAt: null,
        frozenDays: totalFrozenDays,
        benefitEnd: newBenefitEnd,
      },
      adjustmentCreate: {
        order: { connect: { id } },
        type: BenefitAdjustmentType.UNFREEZE,
        days: actualFrozenDays,
        freezeStart: order.frozenAt,
        freezeEnd: now,
        beforeEnd: currentEnd,
        afterEnd: newBenefitEnd,
        reason: this.trimNullable(dto.reason),
        operator: operatorId ? { connect: { id: operatorId } } : undefined,
      },
    });

    return this.toDto(result.order);
  }

  async extend(
    id: string,
    dto: ExtendOrderDto,
    operatorId?: string,
  ): Promise<OrderDto> {
    const order = await this.findActiveOrder(id);

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.FROZEN
    ) {
      throw new BadRequestException(
        `Only paid or frozen orders can be extended (current status: ${order.status})`,
      );
    }

    if (dto.days <= 0) {
      throw new BadRequestException('Extension days must be greater than 0');
    }

    if (operatorId) {
      await this.ensureUserExists(operatorId, 'Operator not found');
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const currentEnd = order.benefitEnd ? new Date(order.benefitEnd) : now;
    const newBenefitEnd = new Date(currentEnd.getTime() + dto.days * msPerDay);

    const result = await this.orderRepository.executeBenefitAdjustment({
      orderId: id,
      orderUpdate: {
        benefitEnd: newBenefitEnd,
      },
      adjustmentCreate: {
        order: { connect: { id } },
        type: BenefitAdjustmentType.EXTENSION,
        days: dto.days,
        beforeEnd: currentEnd,
        afterEnd: newBenefitEnd,
        reason: this.trimNullable(dto.reason),
        operator: operatorId ? { connect: { id: operatorId } } : undefined,
      },
    });

    return this.toDto(result.order);
  }

  async getBenefitAdjustments(
    id: string,
  ): Promise<OrderBenefitAdjustmentDto[]> {
    await this.findActiveOrder(id);
    const adjustments = await this.orderRepository.findBenefitAdjustments(id);
    return adjustments.map((item) => this.toAdjustmentDto(item));
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

  private async resolveDurationDays(
    productId?: string,
    durationDays?: number,
  ): Promise<number | undefined> {
    if (durationDays !== undefined) return durationDays;
    if (!productId) return undefined;

    const product = await this.orderRepository.findProductById(productId);
    return product?.durationDays ?? undefined;
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

    if (query.settledFrom || query.settledTo) {
      where.settledAt = {
        gte: query.settledFrom ? new Date(query.settledFrom) : undefined,
        lte: query.settledTo ? new Date(query.settledTo) : undefined,
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
      settledAt: order.settledAt,
      settleInfo: (order.settleInfo as Record<string, any>) ?? null,
      amount: order.amount,
      currency: order.currency,
      amountCny: order.amountCny,
      fxRateToCny: order.fxRateToCny?.toString() ?? null,
      fxLockedAt: order.fxLockedAt,
      status: order.status,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      durationDays: order.durationDays,
      benefitStart: order.benefitStart,
      benefitEnd: order.benefitEnd,
      frozenDays: order.frozenDays,
      frozenAt: order.frozenAt,
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

  private toAdjustmentDto(
    adj: OrderBenefitAdjustmentWithOperator,
  ): OrderBenefitAdjustmentDto {
    return {
      id: adj.id,
      orderId: adj.orderId,
      type: adj.type,
      days: adj.days,
      freezeStart: adj.freezeStart,
      freezeEnd: adj.freezeEnd,
      beforeEnd: adj.beforeEnd,
      afterEnd: adj.afterEnd,
      reason: adj.reason,
      operatorId: adj.operatorId,
      operator: this.toUserRelation(adj.operator),
      createdAt: adj.createdAt,
    };
  }
}
