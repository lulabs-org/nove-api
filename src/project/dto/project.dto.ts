import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProjectLevel, ProjectStatus } from '@prisma/client';

export class ProjectOwnerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;
}

export class ProjectOwnerListResponseDto {
  @ApiProperty({ type: [ProjectOwnerDto] })
  items: ProjectOwnerDto[];
}

export class ProjectProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productCode: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;
}

export class ProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  subtitle: string | null;

  @ApiPropertyOptional({ nullable: true })
  code: string | null;

  @ApiPropertyOptional({ nullable: true })
  slug: string | null;

  @ApiPropertyOptional({ nullable: true })
  category: string | null;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: ProjectLevel })
  level: ProjectLevel;

  @ApiPropertyOptional({ nullable: true })
  duration: string | null;

  @ApiPropertyOptional({ nullable: true })
  maxStudents: number | null;

  @ApiProperty({
    description: '未软删除的正式学员（STUDENT）数量，由项目成员关系实时统计',
  })
  enrolledCount: number;

  @ApiPropertyOptional({ type: [String], nullable: true })
  prerequisites: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  outcomes: string[] | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional({ nullable: true })
  ownerId: string | null;

  @ApiPropertyOptional({ nullable: true })
  productId: string | null;

  @ApiPropertyOptional({ type: ProjectOwnerDto, nullable: true })
  owner: ProjectOwnerDto | null;

  @ApiPropertyOptional({ type: ProjectProductDto, nullable: true })
  product: ProjectProductDto | null;

  @ApiProperty({ enum: ProjectStatus })
  status: ProjectStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional({ nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  endDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  enrollDeadline: string | null;

  @ApiPropertyOptional({ nullable: true })
  publishedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdById: string | null;

  @ApiPropertyOptional({ nullable: true })
  updatedById: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectDto] })
  items: ProjectDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
