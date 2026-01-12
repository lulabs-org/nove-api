/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:39:57
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:39:58
 * @FilePath: /nove_api/prisma/seeds/mock/products/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Product, ProductCategory } from '@prisma/client';

export interface CreatedProducts {
  products: Product[];
}

export interface ProductConfig {
  productCode: string;
  name: string;
  description: string;
  shortDescription: string;
  category: ProductCategory;
  price: number;
  originalPrice: number;
  tags: string[];
  imageUrl: string;
  videoUrl: string | null;
  sortOrder: number;
  isRecommended: boolean;
  isFeatured: boolean;
  salesCount: number;
  viewCount: number;
  rating: number;
  reviewCount: number;
  publishedAt: Date;
}
