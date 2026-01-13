/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 11:57:15
 * @FilePath: /lulab_backend/prisma/seeds/mock/products/products.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Product, ProductStatus, Currency } from '@prisma/client';
import { ProductConfig } from './type';
import { PRODUCT_CONFIGS } from './config';

async function createProduct(
  prisma: PrismaClient,
  config: ProductConfig,
): Promise<Product> {
  return prisma.product.upsert({
    where: { productCode: config.productCode },
    update: {},
    create: {
      ...config,
      status: ProductStatus.ACTIVE,
      currency: Currency.CNY,
    },
  });
}

export async function createProducts(prisma: PrismaClient): Promise<Product[]> {
  try {
    const productList: Product[] = [];

    for (const config of PRODUCT_CONFIGS) {
      const product = await createProduct(prisma, config);
      productList.push(product);
    }

    return productList;
  } catch (error) {
    console.error('❌ 产品创建失败:', error);
    throw error;
  }
}
