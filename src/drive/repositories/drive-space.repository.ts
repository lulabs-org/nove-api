import { Injectable } from '@nestjs/common';
import { DriveSpaceType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DriveSpaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveById(id: string) {
    return this.prisma.driveSpace.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findById(id: string) {
    return this.prisma.driveSpace.findUnique({ where: { id } });
  }

  async ensurePersonal(userId: string) {
    const where = {
      type: DriveSpaceType.PERSONAL,
      ownerUserId: userId,
      deletedAt: null,
    } satisfies Prisma.DriveSpaceWhereInput;
    const existing = await this.prisma.driveSpace.findFirst({ where });
    if (existing) return existing;
    try {
      return await this.prisma.driveSpace.create({
        data: {
          type: DriveSpaceType.PERSONAL,
          name: '个人空间',
          ownerUserId: userId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      return this.prisma.driveSpace.findFirstOrThrow({ where });
    }
  }

  async ensureOrganization(orgId: string) {
    const where = {
      type: DriveSpaceType.ORG,
      orgId,
      deletedAt: null,
    } satisfies Prisma.DriveSpaceWhereInput;
    const existing = await this.prisma.driveSpace.findFirst({ where });
    if (existing) return existing;

    const org = await this.prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, deletedAt: true },
    });
    if (!org || org.deletedAt) return null;
    try {
      return await this.prisma.driveSpace.create({
        data: {
          type: DriveSpaceType.ORG,
          name: `${org.name}团队空间`,
          orgId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      return this.prisma.driveSpace.findFirstOrThrow({ where });
    }
  }

  async ensureUnassigned() {
    const where = {
      type: DriveSpaceType.SYSTEM_UNASSIGNED,
      deletedAt: null,
    } satisfies Prisma.DriveSpaceWhereInput;
    const existing = await this.prisma.driveSpace.findFirst({ where });
    if (existing) return existing;
    try {
      return await this.prisma.driveSpace.create({
        data: {
          type: DriveSpaceType.SYSTEM_UNASSIGNED,
          name: '待归属会议文件',
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      return this.prisma.driveSpace.findFirstOrThrow({ where });
    }
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
