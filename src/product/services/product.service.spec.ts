/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Currency,
  Prisma,
  Product,
  ProductCategory,
  ProductStatus,
} from '@prisma/client';
import { ProductRepository } from '../repositories/product.repository';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;

  const now = new Date('2026-08-13T00:00:00.000Z');
  const product = (overrides: Partial<Product> = {}): Product => ({
    id: 'product-1',
    productCode: 'COURSE_001',
    name: 'Python 基础课程',
    description: null,
    shortDescription: null,
    category: ProductCategory.COURSE,
    status: ProductStatus.DRAFT,
    price: 29900,
    originalPrice: 39900,
    currency: Currency.CNY,
    durationDays: null,
    maxUsers: null,
    tags: ['Python'],
    imageUrl: null,
    videoUrl: null,
    downloadUrl: null,
    externalUrl: null,
    sortOrder: 0,
    isRecommended: false,
    isFeatured: false,
    salesCount: 0,
    viewCount: 0,
    rating: new Prisma.Decimal(4.8),
    reviewCount: 0,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    publishedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;
    service = new ProductService(repository);
  });

  it('creates a normalized active product and records the actor', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockImplementation((data) =>
      Promise.resolve(
        product({
          productCode: data.productCode,
          name: data.name,
          status: data.status ?? ProductStatus.DRAFT,
          tags: data.tags as string[],
          publishedAt: data.publishedAt as Date,
        }),
      ),
    );

    const result = await service.create(
      {
        productCode: ' COURSE_001 ',
        name: ' Python 基础课程 ',
        category: ProductCategory.COURSE,
        status: ProductStatus.ACTIVE,
        price: 29900,
        originalPrice: 39900,
        tags: [' Python ', 'Python', ' 入门 '],
      },
      'user-1',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productCode: 'COURSE_001',
        name: 'Python 基础课程',
        tags: ['Python', '入门'],
        createdBy: 'user-1',
        updatedBy: 'user-1',
        publishedAt: expect.any(Date),
        archivedAt: null,
      }),
    );
    expect(result.rating).toBe(4.8);
  });

  it('rejects duplicate product codes and invalid price ranges', async () => {
    repository.findByCode.mockResolvedValue(product());
    await expect(
      service.create({
        productCode: 'COURSE_001',
        name: 'Duplicate',
        category: ProductCategory.COURSE,
      }),
    ).rejects.toThrow('Product code already exists');

    repository.findByCode.mockResolvedValue(null);
    await expect(
      service.create({
        productCode: 'COURSE_002',
        name: 'Invalid price',
        category: ProductCategory.COURSE,
        price: 500,
        originalPrice: 400,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds filters and stable sorting for the product list', async () => {
    repository.findMany.mockResolvedValue({ items: [product()], total: 1 });

    const result = await service.findAll({
      page: 2,
      pageSize: 20,
      keyword: 'python',
      category: ProductCategory.COURSE,
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      sortField: 'price',
      sortOrder: 'desc',
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      where: expect.objectContaining({
        category: ProductCategory.COURSE,
        status: ProductStatus.ACTIVE,
        isFeatured: true,
        OR: expect.any(Array),
      }),
      orderBy: [{ price: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 20 });
  });

  it('archives a product and records the updater', async () => {
    repository.findById.mockResolvedValue(product());
    repository.update.mockImplementation((_id, data) =>
      Promise.resolve(
        product({
          status: data.status as ProductStatus,
          archivedAt: data.archivedAt as Date,
          updatedBy: data.updatedBy as string,
        }),
      ),
    );

    const result = await service.updateStatus(
      'product-1',
      ProductStatus.ARCHIVED,
      'user-2',
    );

    expect(repository.update).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        status: ProductStatus.ARCHIVED,
        updatedBy: 'user-2',
        archivedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(ProductStatus.ARCHIVED);
  });

  it('rejects operations for a missing product', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
