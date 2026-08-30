import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const PROJECT_SELECT = {
  id: true,
  orgId: true,
  title: true,
  subtitle: true,
  code: true,
  slug: true,
  category: true,
  image: true,
  description: true,
  level: true,
  duration: true,
  maxStudents: true,
  enrolledCount: true,
  prerequisites: true,
  outcomes: true,
  tags: true,
  productId: true,
  status: true,
  sortOrder: true,
  isFeatured: true,
  startDate: true,
  endDate: true,
  enrollDeadline: true,
  publishedAt: true,
  ownerId: true,
  createdById: true,
  updatedById: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true, fullName: true } },
    },
  },
  product: {
    select: { id: true, productCode: true, name: true, status: true },
  },
} satisfies Prisma.ProjectSelect;

export type ProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof PROJECT_SELECT;
}>;

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProjectUncheckedCreateInput): Promise<ProjectRecord> {
    return this.prisma.project.create({ data, select: PROJECT_SELECT });
  }

  findById(id: string, orgId: string): Promise<ProjectRecord | null> {
    return this.prisma.project.findFirst({
      where: { id, orgId, deletedAt: null },
      select: PROJECT_SELECT,
    });
  }

  findBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.ProjectWhereInput;
    orderBy: Prisma.ProjectOrderByWithRelationInput[];
  }): Promise<{ items: ProjectRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ ...options, select: PROJECT_SELECT }),
      this.prisma.project.count({ where: options.where }),
    ]);
    return { items, total };
  }

  update(
    id: string,
    orgId: string,
    data: Prisma.ProjectUncheckedUpdateInput,
  ): Promise<ProjectRecord> {
    return this.prisma.project.update({
      where: { id, orgId, deletedAt: null },
      data,
      select: PROJECT_SELECT,
    });
  }

  softDelete(
    id: string,
    orgId: string,
    actorId?: string,
  ): Promise<ProjectRecord> {
    return this.prisma.project.update({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date(), updatedById: actorId },
      select: PROJECT_SELECT,
    });
  }

  async isActiveOrgMember(orgId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.orgMember.findFirst({
      where: {
        orgId,
        userId,
        status: 'ACTIVE',
        deletedAt: null,
        user: { active: true, deletedAt: null },
      },
      select: { id: true },
    });
    return Boolean(member);
  }

  async productExists(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    return Boolean(product);
  }
}
