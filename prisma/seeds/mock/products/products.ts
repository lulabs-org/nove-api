/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:50:55
 * @FilePath: /nove_api/prisma/seeds/mock/products/products.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import {
  PrismaClient,
  Product,
  User,
  ProductStatus,
  Currency,
} from '@prisma/client';
import { CreatedProducts, ProductConfig } from './type';
import { PRODUCT_CONFIGS } from './config';

async function createProduct(
  prisma: PrismaClient,
  adminUser: User,
  config: ProductConfig,
): Promise<Product> {
  return prisma.product.upsert({
    where: { productCode: config.productCode },
    update: {},
    create: {
      ...config,
      status: ProductStatus.ACTIVE,
      currency: Currency.CNY,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
}

export async function createProducts(
  prisma: PrismaClient,
  adminUser: User,
): Promise<CreatedProducts> {
  try {
    const productList: Product[] = [];

    for (const config of PRODUCT_CONFIGS) {
      const product = await createProduct(prisma, adminUser, config);
      productList.push(product);
    }

    return {
      products: productList,
    };
  } catch (error) {
    console.error('❌ 产品创建失败:', error);
    throw error;
  }
}
