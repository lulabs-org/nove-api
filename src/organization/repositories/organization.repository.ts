import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({
      data,
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { code },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
    where?: Prisma.OrganizationWhereInput;
  }): Promise<{ items: Organization[]; total: number }> {
    const { skip, take, orderBy, where } = options || {};

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, active: boolean): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { active },
    });
  }

  async delete(id: string): Promise<Organization> {
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(id: string): Promise<{
    totalUsers: number;
    totalDepartments: number;
    disabledUsers: number;
    activeUsers: number;
    adminUsers: number;
    totalApiKeys: number;
    activeApiKeys: number;
  }> {
    const [totalUsers, totalDepartments, totalApiKeys, activeApiKeys] =
      await Promise.all([
        this.prisma.userOrganization.count({
          where: { organizationId: id },
        }),
        this.prisma.department.count({
          where: { orgId: id },
        }),
        this.prisma.apiKey.count({
          where: { organizationId: id },
        }),
        this.prisma.apiKey.count({
          where: { organizationId: id, status: 'ACTIVE' },
        }),
      ]);

    const [disabledUsers, activeUsers, adminUsers] = await Promise.all([
      this.prisma.userOrganization.count({
        where: { organizationId: id, user: { active: false } },
      }),
      this.prisma.userOrganization.count({
        where: { organizationId: id, user: { active: true } },
      }),
      this.prisma.userRole.count({
        where: {
          user: {
            organizations: {
              some: { organizationId: id },
            },
          },
          role: {
            code: 'ADMIN',
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalDepartments,
      disabledUsers,
      activeUsers,
      adminUsers,
      totalApiKeys,
      activeApiKeys,
    };
  }
}
