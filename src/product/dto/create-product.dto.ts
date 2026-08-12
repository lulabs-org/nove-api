import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ProductCategory, ProductStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductDto {
  @ApiProperty({ example: 'COURSE_001', description: '唯一产品编号' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  productCode: string;

  @ApiProperty({ example: 'Python 基础课程' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ description: '产品详细描述' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '列表中展示的简短描述' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  shortDescription?: string;

  @ApiProperty({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '价格，最小货币单位', example: 29900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({ description: '原价，最小货币单位', example: 39900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  originalPrice?: number | null;

  @ApiPropertyOptional({ enum: Currency, default: Currency.CNY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: '有效期天数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number | null;

  @ApiPropertyOptional({ description: '最大用户数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @ApiPropertyOptional({ type: [String], example: ['Python', '入门'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  downloadUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  externalUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}
