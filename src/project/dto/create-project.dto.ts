import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectLevel, ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const nullableTrim = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

const normalizeSlug = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || null;
};

export class CreateProjectDto {
  @ApiProperty({ example: 'Python 数据分析实战项目' })
  @Transform(trim)
  @IsString()
  @Length(1, 150)
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(255)
  subtitle?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'PRJ-2026-001' })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(50)
  code?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'python-data-analysis' })
  @IsOptional()
  @Transform(normalizeSlug)
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must use lowercase letters, numbers, and hyphens',
  })
  slug?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(50)
  category?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: '站内绝对路径或 HTTP(S) URL',
  })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(500)
  @Matches(/^(?:\/(?!\/)|https?:\/\/)/, {
    message: 'image must be an absolute site path or an HTTP(S) URL',
  })
  image?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ProjectLevel, default: ProjectLevel.BEGINNER })
  @IsOptional()
  @IsEnum(ProjectLevel)
  level?: ProjectLevel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  @MaxLength(50)
  duration?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudents?: number | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  enrolledCount?: number;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  prerequisites?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  outcomes?: string[] | null;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  ownerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(nullableTrim)
  @IsString()
  productId?: string | null;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  enrollDeadline?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    default: {},
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
