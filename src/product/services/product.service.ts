import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, ProductStatus } from '@prisma/client';
import {
  CreateProductDto,
  ProductDto,
  ProductListResponseDto,
  QueryProductDto,
  UpdateProductDto,
} from '../dto';
import { ProductRepository } from '../repositories/product.repository';

const SORT_FIELD_MAP: Record<
  string,
  keyof Prisma.ProductOrderByWithRelationInput
> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  price: 'price',
  sortOrder: 'sortOrder',
  salesCount: 'salesCount',
};

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(dto: CreateProductDto, actorId?: string): Promise<ProductDto> {
    const productCode = dto.productCode.trim();
    await this.ensureCodeAvailable(productCode);
    this.validatePrices(dto.price, dto.originalPrice);

    const lifecycle = this.resolveLifecycle(dto.status, dto.publishedAt);
    const product = await this.productRepository.create({
      productCode,
      name: dto.name.trim(),
      description: this.nullableString(dto.description),
      shortDescription: this.nullableString(dto.shortDescription),
      category: dto.category,
      status: dto.status ?? ProductStatus.DRAFT,
      price: dto.price,
      originalPrice: dto.originalPrice,
      currency: dto.currency,
      durationDays: dto.durationDays,
      maxUsers: dto.maxUsers,
      tags: this.normalizeTags(dto.tags),
      imageUrl: this.nullableString(dto.imageUrl),
      videoUrl: this.nullableString(dto.videoUrl),
      downloadUrl: this.nullableString(dto.downloadUrl),
      externalUrl: this.nullableString(dto.externalUrl),
      sortOrder: dto.sortOrder,
      isRecommended: dto.isRecommended,
      isFeatured: dto.isFeatured,
      rating: dto.rating,
      createdBy: actorId,
      updatedBy: actorId,
      ...lifecycle,
    });
    return this.toDto(product);
  }

  async findAll(query: QueryProductDto): Promise<ProductListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildWhere(query);
    const field = SORT_FIELD_MAP[query.sortField ?? 'sortOrder'];
    const direction = query.sortOrder ?? 'asc';
    const { items, total } = await this.productRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: [{ [field]: direction }, { createdAt: 'desc' }],
    });

    return {
      items: items.map((product) => this.toDto(product)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<ProductDto> {
    return this.toDto(await this.findProduct(id));
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actorId?: string,
  ): Promise<ProductDto> {
    const existing = await this.findProduct(id);
    const productCode = dto.productCode?.trim();
    if (productCode && productCode !== existing.productCode) {
      await this.ensureCodeAvailable(productCode, id);
    }

    this.validatePrices(
      dto.price !== undefined ? dto.price : existing.price,
      dto.originalPrice !== undefined
        ? dto.originalPrice
        : existing.originalPrice,
    );

    const lifecycle =
      dto.status !== undefined || dto.publishedAt !== undefined
        ? this.resolveLifecycle(
            dto.status ?? existing.status,
            dto.publishedAt ?? existing.publishedAt?.toISOString(),
            existing,
          )
        : {};

    const product = await this.productRepository.update(id, {
      productCode,
      name: dto.name?.trim(),
      description: this.optionalNullableString(dto, 'description'),
      shortDescription: this.optionalNullableString(dto, 'shortDescription'),
      category: dto.category,
      status: dto.status,
      price: dto.price,
      originalPrice: dto.originalPrice,
      currency: dto.currency,
      durationDays: dto.durationDays,
      maxUsers: dto.maxUsers,
      tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
      imageUrl: this.optionalNullableString(dto, 'imageUrl'),
      videoUrl: this.optionalNullableString(dto, 'videoUrl'),
      downloadUrl: this.optionalNullableString(dto, 'downloadUrl'),
      externalUrl: this.optionalNullableString(dto, 'externalUrl'),
      sortOrder: dto.sortOrder,
      isRecommended: dto.isRecommended,
      isFeatured: dto.isFeatured,
      rating: dto.rating,
      updatedBy: actorId,
      ...lifecycle,
    });
    return this.toDto(product);
  }

  async updateStatus(
    id: string,
    status: ProductStatus,
    actorId?: string,
  ): Promise<ProductDto> {
    const existing = await this.findProduct(id);
    const product = await this.productRepository.update(id, {
      status,
      updatedBy: actorId,
      ...this.resolveLifecycle(
        status,
        existing.publishedAt?.toISOString(),
        existing,
      ),
    });
    return this.toDto(product);
  }

  async delete(id: string): Promise<void> {
    await this.findProduct(id);
    await this.productRepository.delete(id);
  }

  private async findProduct(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async ensureCodeAvailable(
    productCode: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.productRepository.findByCode(productCode);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('Product code already exists');
    }
  }

  private validatePrices(
    price?: number | null,
    originalPrice?: number | null,
  ): void {
    if (price != null && originalPrice != null && originalPrice < price) {
      throw new BadRequestException(
        'Original price must be greater than or equal to price',
      );
    }
  }

  private buildWhere(query: QueryProductDto): Prisma.ProductWhereInput {
    const keyword = query.keyword?.trim();
    return {
      ...(keyword
        ? {
            OR: [
              { productCode: { contains: keyword, mode: 'insensitive' } },
              { name: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
              {
                shortDescription: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.isRecommended !== undefined
        ? { isRecommended: query.isRecommended }
        : {}),
      ...(query.isFeatured !== undefined
        ? { isFeatured: query.isFeatured }
        : {}),
    };
  }

  private resolveLifecycle(
    status: ProductStatus = ProductStatus.DRAFT,
    publishedAt?: string | null,
    existing?: Product,
  ): { publishedAt?: Date | null; archivedAt: Date | null } {
    return {
      publishedAt:
        status === ProductStatus.ACTIVE
          ? publishedAt
            ? new Date(publishedAt)
            : (existing?.publishedAt ?? new Date())
          : publishedAt
            ? new Date(publishedAt)
            : existing?.publishedAt,
      archivedAt:
        status === ProductStatus.ARCHIVED
          ? (existing?.archivedAt ?? new Date())
          : null,
    };
  }

  private nullableString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    const normalized = value?.trim();
    return normalized || null;
  }

  private optionalNullableString(
    dto: UpdateProductDto,
    key:
      | 'description'
      | 'shortDescription'
      | 'imageUrl'
      | 'videoUrl'
      | 'downloadUrl'
      | 'externalUrl',
  ): string | null | undefined {
    if (!Object.prototype.hasOwnProperty.call(dto, key)) return undefined;
    return this.nullableString(dto[key] as string | null);
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) return [];
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }

  private toDto(product: Product): ProductDto {
    return {
      ...product,
      rating: product.rating === null ? null : product.rating.toNumber(),
      publishedAt: product.publishedAt?.toISOString() ?? null,
      archivedAt: product.archivedAt?.toISOString() ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
