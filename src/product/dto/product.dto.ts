import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ProductCategory, ProductStatus } from '@prisma/client';

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productCode: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  shortDescription: string | null;

  @ApiProperty({ enum: ProductCategory })
  category: ProductCategory;

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiPropertyOptional({ nullable: true })
  price: number | null;

  @ApiPropertyOptional({ nullable: true })
  originalPrice: number | null;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiPropertyOptional({ nullable: true })
  durationDays: number | null;

  @ApiPropertyOptional({ nullable: true })
  maxUsers: number | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional({ nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  videoUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  downloadUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  externalUrl: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isRecommended: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  salesCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiPropertyOptional({ nullable: true })
  rating: number | null;

  @ApiProperty()
  reviewCount: number;

  @ApiPropertyOptional({ nullable: true })
  createdBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  updatedBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  publishedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  archivedAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductDto] })
  items: ProductDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
