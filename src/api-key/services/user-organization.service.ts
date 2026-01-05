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
    // 首先尝试获取主要组织
    const primaryOrg = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        isPrimary: true,
      },
      select: {
        organizationId: true,
      },
    });

    if (primaryOrg) {
      return primaryOrg.organizationId;
    }

    // 如果没有主要组织，获取第一个组织
    const firstOrg = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
      },
      select: {
        organizationId: true,
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

    return firstOrg.organizationId;
  }

  /**
   * 获取用户的所有组织 ID
   * @param userId 用户 ID
   * @returns 组织 ID 数组
   */
  async getAllOrganizationIds(userId: string): Promise<string[]> {
    const orgs = await this.prisma.userOrganization.findMany({
      where: {
        userId,
      },
      select: {
        organizationId: true,
      },
    });

    return orgs.map((org) => org.organizationId);
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
    const count = await this.prisma.userOrganization.count({
      where: {
        userId,
        organizationId,
      },
    });

    return count > 0;
  }
}
