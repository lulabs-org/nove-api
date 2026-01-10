/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-16 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-16 10:00:00
 * @FilePath: /lulab_backend/prisma/seeds/products.ts
 * @Description: 产品数据种子模块 - 优化版本
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import {
  PrismaClient,
  Product,
  User,
  ProductCategory,
  ProductStatus,
  Currency,
} from '@prisma/client';

export interface CreatedProducts {
  products: Product[];
}

interface ProductConfig {
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

async function createProduct(
  prisma: PrismaClient,
  adminUser: User,
  config: ProductConfig,
): Promise<Product> {
  return prisma.product.upsert({
    where: { productCode: config.productCode },
    update: {},
    create: {
      productCode: config.productCode,
      name: config.name,
      description: config.description,
      shortDescription: config.shortDescription,
      category: config.category,
      status: ProductStatus.ACTIVE,
      price: config.price,
      originalPrice: config.originalPrice,
      currency: Currency.CNY,
      tags: config.tags,
      imageUrl: config.imageUrl,
      videoUrl: config.videoUrl,
      sortOrder: config.sortOrder,
      isRecommended: config.isRecommended,
      isFeatured: config.isFeatured,
      salesCount: config.salesCount,
      viewCount: config.viewCount,
      rating: config.rating,
      reviewCount: config.reviewCount,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
      publishedAt: config.publishedAt,
    },
  });
}

export async function createProducts(
  prisma: PrismaClient,
  adminUser: User,
): Promise<CreatedProducts> {
  try {
    const productConfigs = [
      {
        productCode: 'COURSE_001',
        name: 'Python 基础编程课程',
        description:
          '从零开始学习 Python 编程，适合初学者的完整课程体系。包含基础语法、数据结构、面向对象编程等核心内容。',
        shortDescription: 'Python 零基础入门课程',
        category: ProductCategory.COURSE,
        price: 29900,
        originalPrice: 39900,
        tags: ['编程', 'Python', '初学者', '基础'],
        imageUrl: 'https://example.com/images/python-course.jpg',
        videoUrl: 'https://example.com/videos/python-intro.mp4',
        sortOrder: 1,
        isRecommended: true,
        isFeatured: true,
        salesCount: 156,
        viewCount: 2340,
        rating: 4.8,
        reviewCount: 89,
        publishedAt: new Date('2024-01-15'),
      },
      {
        productCode: 'COURSE_002',
        name: 'JavaScript 全栈开发',
        description:
          '掌握现代 JavaScript 开发技术，包含前端框架、后端开发、数据库操作等全栈技能。',
        shortDescription: 'JavaScript 全栈开发课程',
        category: ProductCategory.COURSE,
        price: 49900,
        originalPrice: 69900,
        tags: ['JavaScript', '全栈', 'React', 'Node.js'],
        imageUrl: 'https://example.com/images/js-course.jpg',
        videoUrl: 'https://example.com/videos/js-intro.mp4',
        sortOrder: 2,
        isRecommended: true,
        isFeatured: false,
        salesCount: 234,
        viewCount: 3456,
        rating: 4.9,
        reviewCount: 167,
        publishedAt: new Date('2024-01-20'),
      },
      {
        productCode: 'COURSE_003',
        name: '数据分析与可视化',
        description:
          '学习使用 Python 进行数据分析，掌握 Pandas、NumPy、Matplotlib 等工具，培养数据思维。',
        shortDescription: '数据分析入门课程',
        category: ProductCategory.COURSE,
        price: 39900,
        originalPrice: 59900,
        tags: ['数据分析', 'Python', 'Pandas', '可视化'],
        imageUrl: 'https://example.com/images/data-course.jpg',
        videoUrl: 'https://example.com/videos/data-intro.mp4',
        sortOrder: 3,
        isRecommended: false,
        isFeatured: true,
        salesCount: 89,
        viewCount: 1567,
        rating: 4.7,
        reviewCount: 45,
        publishedAt: new Date('2024-02-01'),
      },
      {
        productCode: 'MEMBERSHIP_001',
        name: '年度会员服务',
        description:
          '享受全年无限制学习权限，包含所有课程内容、专属答疑服务、学习资料下载等特权。',
        shortDescription: '年度VIP会员',
        category: ProductCategory.MEMBERSHIP,
        price: 99900,
        originalPrice: 129900,
        tags: ['会员', 'VIP', '全课程', '答疑'],
        imageUrl: 'https://example.com/images/membership.jpg',
        videoUrl: null,
        sortOrder: 4,
        isRecommended: true,
        isFeatured: true,
        salesCount: 567,
        viewCount: 8901,
        rating: 4.9,
        reviewCount: 234,
        publishedAt: new Date('2024-01-10'),
      },
      {
        productCode: 'CONSULTING_001',
        name: '一对一技术咨询',
        description:
          '专业导师一对一指导，针对个人学习情况制定专属学习计划，解决学习过程中的疑难问题。',
        shortDescription: '一对一技术指导',
        category: ProductCategory.CONSULTATION,
        price: 19900,
        originalPrice: 29900,
        tags: ['咨询', '一对一', '导师', '指导'],
        imageUrl: 'https://example.com/images/consulting.jpg',
        videoUrl: null,
        sortOrder: 5,
        isRecommended: false,
        isFeatured: false,
        salesCount: 123,
        viewCount: 789,
        rating: 4.8,
        reviewCount: 67,
        publishedAt: new Date('2024-02-15'),
      },
      {
        productCode: 'PROJECT_001',
        name: '企业级项目实战',
        description:
          '通过真实企业项目案例，学习完整的开发流程，提升实际开发能力和项目经验。',
        shortDescription: '企业项目实战训练',
        category: ProductCategory.OTHER,
        price: 79900,
        originalPrice: 99900,
        tags: ['实战', '项目', '企业级', '开发'],
        imageUrl: 'https://example.com/images/project.jpg',
        videoUrl: 'https://example.com/videos/project-intro.mp4',
        sortOrder: 6,
        isRecommended: true,
        isFeatured: false,
        salesCount: 78,
        viewCount: 1234,
        rating: 4.6,
        reviewCount: 34,
        publishedAt: new Date('2024-03-01'),
      },
    ];

    const productList: Product[] = [];

    for (const config of productConfigs) {
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
