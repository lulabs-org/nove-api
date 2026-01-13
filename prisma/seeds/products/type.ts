/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:39:57
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 11:58:09
 * @FilePath: /lulab_backend/prisma/seeds/mock/products/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ProductCategory } from '@prisma/client';

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
