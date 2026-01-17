import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * 用户组织服务
 * 用于获取用户的组织信息
 */
@Injectable()
export class UserOrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的主要组织 ID
   * @param userId 用户 ID
   * @returns 组织 ID
   */
  async getPrimaryOrganizationId(userId: string): Promise<string> {
    // 首先尝试获取主要部门
    const primaryDept = await this.prisma.orgMember.findFirst({
      where: {
        userId,
        primaryDeptId: { not: null },
      },
      include: {
        primaryDept: true,
      },
    });

    if (primaryDept && primaryDept.primaryDept) {
      return primaryDept.orgId;
    }

    // 如果没有主要部门，获取第一个组织
    const firstOrg = await this.prisma.orgMember.findFirst({
      where: {
        userId,
      },
      select: {
        orgId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!firstOrg) {
      throw new BadRequestException(
        'User is not associated with any organization. Please contact administrator.',
      );
    }

    return firstOrg.orgId;
  }

  /**
   * 获取用户的所有组织 ID
   * @param userId 用户 ID
   * @returns 组织 ID 数组
   */
  async getAllOrganizationIds(userId: string): Promise<string[]> {
    const orgs = await this.prisma.orgMember.findMany({
      where: {
        userId,
      },
      select: {
        orgId: true,
      },
    });

    return orgs.map((org) => org.orgId);
  }

  /**
   * 验证用户是否属于指定组织
   * @param userId 用户 ID
   * @param organizationId 组织 ID
   * @returns 是否属于该组织
   */
  async belongsToOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const count = await this.prisma.orgMember.count({
      where: {
        userId,
        orgId: organizationId,
      },
    });

    return count > 0;
  }
}
