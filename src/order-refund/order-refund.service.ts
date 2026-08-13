import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import {
  CreateOrderRefundDto,
  OrderRefundDto,
  OrderRefundListResponse,
  QueryOrderRefundDto,
  UpdateOrderRefundDto,
  UpdateRefundStatusDto,
} from './dto';
import {
  OrderRefundRepository,
  OrderRefundWithRelations,
} from './order-refund.repository';

const SORT_FIELDS: Record<
  string,
  keyof Prisma.OrderRefundOrderByWithRelationInput
> = {
  afterSaleCode: 'afterSaleCode',
  refundAmount: 'refundAmount',
  status: 'status',
  submittedAt: 'submittedAt',
  refundedAt: 'refundedAt',
  financialSettledAt: 'financialSettledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

@Injectable()
export class OrderRefundService {
  constructor(private readonly repository: OrderRefundRepository) {}

  async create(
    dto: CreateOrderRefundDto,
    actorId?: string,
  ): Promise<OrderRefundDto> {
    const afterSaleCode = dto.afterSaleCode.trim();
    if (!afterSaleCode)
      throw new BadRequestException('After-sale code is required');
    if (await this.repository.findByAfterSaleCode(afterSaleCode)) {
      throw new ConflictException('After-sale code already exists');
    }
    await this.ensureRelations(dto.orderId, dto.parentId);

    const item = await this.repository.create({
      afterSaleCode,
      refundChannel: dto.refundChannel,
      approvalUrl: this.trimNullable(dto.approvalUrl),
      refundAmount: dto.refundAmount,
      refundReason: this.trimNullable(dto.refundReason),
      benefitUsedDays: dto.benefitUsedDays,
      applicantName: this.trimNullable(dto.applicantName),
      financialNote: this.trimNullable(dto.financialNote),
      productCategory: this.trimNullable(dto.productCategory),
      submittedAt: this.toDate(dto.submittedAt) ?? new Date(),
      order: dto.orderId ? { connect: { id: dto.orderId } } : undefined,
      parentRefund: dto.parentId
        ? { connect: { id: dto.parentId } }
        : undefined,
      creator: actorId ? { connect: { id: actorId } } : undefined,
    });
    return this.toDto(item);
  }

  async findAll(query: QueryOrderRefundDto): Promise<OrderRefundListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildWhere(query);
    const { items, total } = await this.repository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: this.buildOrderBy(query),
    });
    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<OrderRefundDto> {
    return this.toDto(await this.findActive(id));
  }

  async update(id: string, dto: UpdateOrderRefundDto): Promise<OrderRefundDto> {
    await this.findActive(id);
    if (dto.parentId === id)
      throw new BadRequestException('Refund cannot be its own parent');
    await this.ensureRelations(dto.orderId, dto.parentId);

    return this.toDto(
      await this.repository.update(id, {
        refundChannel: dto.refundChannel,
        approvalUrl: this.trimNullable(dto.approvalUrl),
        refundAmount: dto.refundAmount,
        refundReason: this.trimNullable(dto.refundReason),
        benefitUsedDays: dto.benefitUsedDays,
        applicantName: this.trimNullable(dto.applicantName),
        financialNote: this.trimNullable(dto.financialNote),
        productCategory: this.trimNullable(dto.productCategory),
        submittedAt: this.toDate(dto.submittedAt),
        order: dto.orderId ? { connect: { id: dto.orderId } } : undefined,
        parentRefund: dto.parentId
          ? { connect: { id: dto.parentId } }
          : undefined,
      }),
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateRefundStatusDto,
  ): Promise<OrderRefundDto> {
    await this.findActive(id);
    const status = dto.status ?? RefundStatus.SETTLED;
    const now = new Date();
    return this.toDto(
      await this.repository.update(id, {
        status,
        financialNote: this.trimNullable(dto.financialNote),
        refundedAt:
          status === RefundStatus.SETTLED
            ? (this.toDate(dto.refundedAt) ?? now)
            : null,
        financialSettledAt:
          status === RefundStatus.SETTLED
            ? (this.toDate(dto.financialSettledAt) ?? now)
            : null,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.findActive(id);
    await this.repository.softDelete(id);
  }

  private async findActive(id: string): Promise<OrderRefundWithRelations> {
    const item = await this.repository.findById(id);
    if (!item || item.deletedAt)
      throw new NotFoundException('Order refund not found');
    return item;
  }

  private async ensureRelations(
    orderId?: string,
    parentId?: string,
  ): Promise<void> {
    if (orderId && !(await this.repository.orderExists(orderId))) {
      throw new BadRequestException('Order does not exist');
    }
    if (parentId && !(await this.repository.refundExists(parentId))) {
      throw new BadRequestException('Parent refund does not exist');
    }
  }

  private buildWhere(query: QueryOrderRefundDto): Prisma.OrderRefundWhereInput {
    const where: Prisma.OrderRefundWhereInput = {};
    if (!query.includeDeleted) where.deletedAt = null;
    if (query.status) where.status = query.status;
    if (query.refundChannel) where.refundChannel = query.refundChannel;
    if (query.orderId) where.orderId = query.orderId;
    if (query.submittedFrom || query.submittedTo) {
      where.submittedAt = {
        gte: this.toDate(query.submittedFrom),
        lte: this.toDate(query.submittedTo),
      };
    }
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [
        { afterSaleCode: { contains: keyword, mode: 'insensitive' } },
        { applicantName: { contains: keyword, mode: 'insensitive' } },
        { refundReason: { contains: keyword, mode: 'insensitive' } },
        { order: { orderCode: { contains: keyword, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private buildOrderBy(
    query: QueryOrderRefundDto,
  ): Prisma.OrderRefundOrderByWithRelationInput[] {
    const field =
      SORT_FIELDS[query.sortField ?? 'submittedAt'] ?? 'submittedAt';
    const direction = query.sortOrder?.startsWith('asc') ? 'asc' : 'desc';
    return [{ [field]: direction }, { createdAt: 'desc' }];
  }

  private toDto(item: OrderRefundWithRelations): OrderRefundDto {
    return {
      ...item,
      creator: item.creator
        ? {
            id: item.creator.id,
            username: item.creator.username,
            email: item.creator.email,
            displayName: item.creator.profile?.displayName ?? null,
          }
        : null,
    };
  }

  private trimNullable(value?: string): string | undefined {
    return value === undefined ? undefined : value.trim() || undefined;
  }

  private toDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }
}
