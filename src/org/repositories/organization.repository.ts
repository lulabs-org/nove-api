import { Injectable } from '@nestjs/common';
import { Org, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrgCreateInput): Promise<Org> {
    return this.prisma.org.create({
      data,
    });
  }

  async findById(id: string): Promise<Org | null> {
    return this.prisma.org.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Org | null> {
    return this.prisma.org.findUnique({
      where: { code },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.OrgOrderByWithRelationInput;
    where?: Prisma.OrgWhereInput;
  }): Promise<{ items: Org[]; total: number }> {
    const { skip, take, orderBy, where } = options || {};

    const [items, total] = await Promise.all([
      this.prisma.org.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.org.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.OrgUpdateInput): Promise<Org> {
    return this.prisma.org.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, active: boolean): Promise<Org> {
    return this.prisma.org.update({
      where: { id },
      data: { active },
    });
  }

  async delete(id: string): Promise<Org> {
    return this.prisma.org.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Org> {
    return this.prisma.org.update({
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
        this.prisma.orgMember.count({
          where: { orgId: id },
        }),
        this.prisma.dept.count({
          where: { orgId: id },
        }),
        this.prisma.apiKey.count({
          where: { orgId: id },
        }),
        this.prisma.apiKey.count({
          where: { orgId: id, status: 'ACTIVE' },
        }),
      ]);

    const [disabledUsers, activeUsers, adminUsers] = await Promise.all([
      this.prisma.orgMember.count({
        where: { orgId: id, user: { active: false } },
      }),
      this.prisma.orgMember.count({
        where: { orgId: id, user: { active: true } },
      }),
      this.prisma.memberRole.count({
        where: {
          member: {
            orgId: id,
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
