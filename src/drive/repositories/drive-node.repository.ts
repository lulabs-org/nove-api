import { Injectable } from '@nestjs/common';
import { DriveNodeType, FileVersionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const latestFileVersionInclude = {
  file: {
    include: {
      versions: { orderBy: { version: 'desc' as const }, take: 1 },
    },
  },
} satisfies Prisma.DriveNodeInclude;

export type DriveNodeWithLatestVersion = Prisma.DriveNodeGetPayload<{
  include: typeof latestFileVersionInclude;
}>;

@Injectable()
export class DriveNodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(options: {
    spaceId: string;
    parentId: string | null;
    limit: number;
    cursor?: string;
  }) {
    return this.prisma.driveNode.findMany({
      where: {
        spaceId: options.spaceId,
        parentId: options.parentId,
        deletedAt: null,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: latestFileVersionInclude,
    });
  }

  createFolder(data: {
    spaceId: string;
    parentId: string | null;
    name: string;
    createdById: string;
  }) {
    return this.prisma.driveNode.create({
      data: { ...data, type: DriveNodeType.FOLDER },
    });
  }

  update(
    id: string,
    data: { name?: string; inheritAcl?: boolean; parentId?: string | null },
  ) {
    return this.prisma.driveNode.update({
      where: { id },
      data,
      include: latestFileVersionInclude,
    });
  }

  findActiveById(id: string) {
    return this.prisma.driveNode.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findById(id: string) {
    return this.prisma.driveNode.findUnique({ where: { id } });
  }

  findActiveFolder(id: string, spaceId: string) {
    return this.prisma.driveNode.findFirst({
      where: {
        id,
        spaceId,
        deletedAt: null,
        type: DriveNodeType.FOLDER,
      },
    });
  }

  findActiveParent(id: string) {
    return this.prisma.driveNode.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
  }

  findNameConflict(options: {
    spaceId: string;
    parentId: string | null;
    name: string;
    excludeId?: string;
  }) {
    return this.prisma.driveNode.findFirst({
      where: {
        spaceId: options.spaceId,
        parentId: options.parentId,
        name: { equals: options.name, mode: 'insensitive' },
        deletedAt: null,
        ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  findParentId(id: string) {
    return this.prisma.driveNode.findUnique({
      where: { id },
      select: { parentId: true },
    });
  }

  async collectSubtreeIds(rootId: string, includeDeleted = false) {
    const ids: string[] = [];
    let frontier = [rootId];
    const seen = new Set<string>();
    while (frontier.length) {
      frontier = frontier.filter((id) => !seen.has(id));
      if (!frontier.length) break;
      frontier.forEach((id) => seen.add(id));
      ids.push(...frontier);
      const children = await this.prisma.driveNode.findMany({
        where: {
          parentId: { in: frontier },
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        select: { id: true },
      });
      frontier = children.map((child) => child.id);
    }
    return ids;
  }

  markTrashed(ids: string[], deletedAt: Date, purgeAfter: Date) {
    return this.prisma.driveNode.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt, purgeAfter },
    });
  }

  restore(ids: string[]) {
    return this.prisma.driveNode.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null, purgeAfter: null },
    });
  }

  listTrash(spaceId: string) {
    return this.prisma.driveNode.findMany({
      where: { spaceId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 100,
      include: latestFileVersionInclude,
    });
  }
}

export type NodeDtoSource = {
  id: string;
  spaceId: string;
  parentId: string | null;
  type: DriveNodeType;
  name: string;
  inheritAcl: boolean;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file?: {
    versions: Array<{
      contentType: string;
      sizeBytes: bigint;
      status: FileVersionStatus;
    }>;
  } | null;
};
