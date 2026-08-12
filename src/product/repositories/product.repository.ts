import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductUncheckedCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findByCode(productCode: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { productCode } });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.ProductWhereInput;
    orderBy: Prisma.ProductOrderByWithRelationInput[];
  }): Promise<{ items: Product[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.product.findMany(options),
      this.prisma.product.count({ where: options.where }),
    ]);
    return { items, total };
  }

  update(
    id: string,
    data: Prisma.ProductUncheckedUpdateInput,
  ): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  delete(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }
}
