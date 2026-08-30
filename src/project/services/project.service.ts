import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  CreateProjectDto,
  ProjectDto,
  ProjectListResponseDto,
  ProjectOwnerListResponseDto,
  QueryProjectDto,
  QueryProjectOwnerDto,
  UpdateProjectDto,
} from '../dto';
import {
  ProjectRecord,
  ProjectRepository,
} from '../repositories/project.repository';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  requireOrgId(orgId?: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Current organization is required');
    }
    return orgId;
  }

  async create(
    orgId: string,
    dto: CreateProjectDto,
    actorId?: string | null,
  ): Promise<ProjectDto> {
    await this.ensureSlugAvailable(dto.slug);
    await this.validateRelations(dto.ownerId, dto.productId);
    this.validateCapacity(0, dto.maxStudents);
    this.validateDates(dto.startDate, dto.endDate);

    const status = dto.status ?? ProjectStatus.DRAFT;
    const project = await this.projectRepository.create({
      orgId,
      title: dto.title.trim(),
      subtitle: this.nullableString(dto.subtitle),
      code: this.generateProjectCode(),
      slug: dto.slug ?? null,
      category: this.nullableString(dto.category),
      image: this.nullableString(dto.image),
      description: this.nullableString(dto.description),
      level: dto.level,
      duration: this.nullableString(dto.duration),
      maxStudents: dto.maxStudents,
      prerequisites: this.nullableJsonList(dto.prerequisites),
      outcomes: this.nullableJsonList(dto.outcomes),
      tags: this.normalizeList(dto.tags) ?? [],
      ownerId: dto.ownerId,
      productId: dto.productId,
      status,
      sortOrder: dto.sortOrder,
      isFeatured: dto.isFeatured,
      startDate: this.dateValue(dto.startDate),
      endDate: this.dateValue(dto.endDate),
      enrollDeadline: this.dateValue(dto.enrollDeadline),
      publishedAt: status === ProjectStatus.DRAFT ? null : new Date(),
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      createdById: actorId,
      updatedById: actorId,
    });
    return this.toDto(project);
  }

  async findAll(
    orgId: string,
    query: QueryProjectDto,
  ): Promise<ProjectListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where: Prisma.ProjectWhereInput = {
      orgId,
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { subtitle: { contains: keyword, mode: 'insensitive' } },
              { code: { contains: keyword, mode: 'insensitive' } },
              { slug: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.isFeatured !== undefined
        ? { isFeatured: query.isFeatured }
        : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const sortField = query.sortField ?? 'sortOrder';
    const sortOrder = query.sortOrder ?? 'asc';
    const { items, total } = await this.projectRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: [{ [sortField]: sortOrder }, { createdAt: 'desc' }],
    });

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, orgId: string): Promise<ProjectDto> {
    return this.toDto(await this.findProject(id, orgId));
  }

  async findOwnerOptions(
    query: QueryProjectOwnerDto,
  ): Promise<ProjectOwnerListResponseDto> {
    const keyword = query.keyword.trim();
    const items = await this.projectRepository.findOwnerOptions({ keyword });
    return {
      items: items.map((user) => ({
        id: user.id,
        displayName:
          user.profile?.displayName ||
          user.profile?.fullName ||
          user.username ||
          user.email ||
          user.id,
      })),
    };
  }

  async update(
    id: string,
    orgId: string,
    dto: UpdateProjectDto,
    actorId?: string | null,
  ): Promise<ProjectDto> {
    const existing = await this.findProject(id, orgId);
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      await this.ensureSlugAvailable(dto.slug, id);
    }
    if (dto.ownerId !== undefined || dto.productId !== undefined) {
      await this.validateRelations(dto.ownerId, dto.productId);
    }

    const maxStudents =
      dto.maxStudents !== undefined ? dto.maxStudents : existing.maxStudents;
    this.validateCapacity(existing._count.members, maxStudents);

    const startDate =
      dto.startDate !== undefined
        ? this.dateValue(dto.startDate)
        : existing.startDate;
    const endDate =
      dto.endDate !== undefined
        ? this.dateValue(dto.endDate)
        : existing.endDate;
    this.validateDateObjects(startDate, endDate);

    const status = dto.status ?? existing.status;
    const project = await this.projectRepository.update(id, orgId, {
      title: dto.title?.trim(),
      subtitle: this.optionalNullableString(dto, 'subtitle'),
      code: existing.code ? undefined : this.generateProjectCode(),
      slug: dto.slug,
      category: this.optionalNullableString(dto, 'category'),
      image: this.optionalNullableString(dto, 'image'),
      description: this.optionalNullableString(dto, 'description'),
      level: dto.level,
      duration: this.optionalNullableString(dto, 'duration'),
      maxStudents: dto.maxStudents,
      prerequisites:
        dto.prerequisites === undefined
          ? undefined
          : this.nullableJsonList(dto.prerequisites),
      outcomes:
        dto.outcomes === undefined
          ? undefined
          : this.nullableJsonList(dto.outcomes),
      tags:
        dto.tags === undefined
          ? undefined
          : (this.normalizeList(dto.tags) ?? []),
      ownerId: dto.ownerId,
      productId: dto.productId,
      status: dto.status,
      sortOrder: dto.sortOrder,
      isFeatured: dto.isFeatured,
      startDate: dto.startDate === undefined ? undefined : startDate,
      endDate: dto.endDate === undefined ? undefined : endDate,
      enrollDeadline:
        dto.enrollDeadline === undefined
          ? undefined
          : this.dateValue(dto.enrollDeadline),
      publishedAt:
        status !== ProjectStatus.DRAFT && !existing.publishedAt
          ? new Date()
          : undefined,
      metadata:
        dto.metadata === undefined
          ? undefined
          : (dto.metadata as Prisma.InputJsonValue),
      updatedById: actorId,
    });
    return this.toDto(project);
  }

  async updateStatus(
    id: string,
    orgId: string,
    status: ProjectStatus,
    actorId?: string | null,
  ): Promise<ProjectDto> {
    const existing = await this.findProject(id, orgId);
    const project = await this.projectRepository.update(id, orgId, {
      status,
      updatedById: actorId,
      publishedAt:
        status !== ProjectStatus.DRAFT && !existing.publishedAt
          ? new Date()
          : undefined,
    });
    return this.toDto(project);
  }

  async delete(
    id: string,
    orgId: string,
    actorId?: string | null,
  ): Promise<void> {
    await this.findProject(id, orgId);
    await this.projectRepository.softDelete(id, orgId, actorId ?? undefined);
  }

  private async findProject(id: string, orgId: string): Promise<ProjectRecord> {
    const project = await this.projectRepository.findById(id, orgId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async ensureSlugAvailable(
    slug?: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (!slug) return;
    const existing = await this.projectRepository.findBySlug(slug);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('Project slug already exists');
    }
  }

  private async validateRelations(
    ownerId?: string | null,
    productId?: string | null,
  ): Promise<void> {
    if (ownerId && !(await this.projectRepository.activeUserExists(ownerId))) {
      throw new BadRequestException('Project owner must be an active user');
    }
    if (productId && !(await this.projectRepository.productExists(productId))) {
      throw new BadRequestException('Product not found');
    }
  }

  private validateCapacity(
    enrolledCount: number,
    maxStudents?: number | null,
  ): void {
    if (maxStudents != null && enrolledCount > maxStudents) {
      throw new BadRequestException(
        'Enrolled count cannot exceed maximum students',
      );
    }
  }

  private validateDates(
    startDate?: string | null,
    endDate?: string | null,
  ): void {
    this.validateDateObjects(
      this.dateValue(startDate),
      this.dateValue(endDate),
    );
  }

  private validateDateObjects(
    startDate?: Date | null,
    endDate?: Date | null,
  ): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
  }

  private dateValue(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    return value === null ? null : new Date(value);
  }

  private nullableString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    const normalized = value?.trim();
    return normalized || null;
  }

  private optionalNullableString(
    dto: UpdateProjectDto,
    key: 'subtitle' | 'category' | 'image' | 'description' | 'duration',
  ): string | null | undefined {
    return dto[key] === undefined ? undefined : this.nullableString(dto[key]);
  }

  private generateProjectCode(): string {
    const year = new Date().getUTCFullYear();
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    return `PRJ-${year}-${suffix}`;
  }

  private normalizeList(value?: string[] | null): string[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  }

  private nullableJsonList(
    value?: string[] | null,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    const normalized = this.normalizeList(value);
    if (normalized === undefined) return undefined;
    return normalized === null
      ? Prisma.DbNull
      : (normalized as Prisma.InputJsonValue);
  }

  private jsonStringList(value: Prisma.JsonValue | null): string[] | null {
    if (!Array.isArray(value)) return null;
    return value.filter((item): item is string => typeof item === 'string');
  }

  private toDto(project: ProjectRecord): ProjectDto {
    return {
      id: project.id,
      orgId: project.orgId!,
      title: project.title,
      subtitle: project.subtitle,
      code: project.code,
      slug: project.slug,
      category: project.category,
      image: project.image,
      description: project.description,
      level: project.level,
      duration: project.duration,
      maxStudents: project.maxStudents,
      enrolledCount: project._count.members,
      prerequisites: this.jsonStringList(project.prerequisites),
      outcomes: this.jsonStringList(project.outcomes),
      tags: project.tags,
      ownerId: project.ownerId,
      productId: project.productId,
      owner: project.owner
        ? {
            id: project.owner.id,
            displayName:
              project.owner.profile?.displayName ||
              project.owner.profile?.fullName ||
              project.owner.username,
          }
        : null,
      product: project.product,
      status: project.status,
      sortOrder: project.sortOrder,
      isFeatured: project.isFeatured,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      enrollDeadline: project.enrollDeadline?.toISOString() ?? null,
      publishedAt: project.publishedAt?.toISOString() ?? null,
      createdById: project.createdById,
      updatedById: project.updatedById,
      metadata: project.metadata as Record<string, unknown>,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
