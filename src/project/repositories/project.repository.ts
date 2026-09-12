import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DriveAction, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DriveAclService, DriveAuthContext } from '@/drive/policies';

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
  _count: {
    select: {
      members: { where: { role: 'STUDENT', deletedAt: null } },
    },
  },
} satisfies Prisma.ProjectSelect;

export type ProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof PROJECT_SELECT;
}>;

const PROJECT_OWNER_SELECT = {
  id: true,
  username: true,
  email: true,
  profile: { select: { displayName: true, fullName: true } },
} satisfies Prisma.UserSelect;

export type ProjectOwnerRecord = Prisma.UserGetPayload<{
  select: typeof PROJECT_OWNER_SELECT;
}>;

@Injectable()
export class ProjectRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acl: DriveAclService,
  ) {}

  create(
    data: Prisma.ProjectUncheckedCreateInput,
    auth?: DriveAuthContext,
  ): Promise<ProjectRecord> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data, select: PROJECT_SELECT });
      await this.syncCover(tx, project, auth);
      return project;
    });
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
    auth?: DriveAuthContext,
  ): Promise<ProjectRecord> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id, orgId, deletedAt: null },
        data,
        select: PROJECT_SELECT,
      });
      if (data.image !== undefined) await this.syncCover(tx, project, auth);
      return project;
    });
  }

  private async syncCover(
    tx: Prisma.TransactionClient,
    project: ProjectRecord,
    auth?: DriveAuthContext,
  ) {
    const fileId = project.image?.match(
      /^drive:\/\/file\/([a-zA-Z0-9_-]+)$/,
    )?.[1];
    const scope = {
      targetType: 'PROJECT' as const,
      targetId: project.id,
      purpose: 'COVER',
      active: true,
    };
    const old = await tx.fileBinding.findMany({
      where: { ...scope, ...(fileId ? { fileId: { not: fileId } } : {}) },
      include: { file: { include: { node: true } } },
    });
    if (fileId) {
      if (!auth) throw new ForbiddenException('绑定项目封面需要用户身份');
      const file = await tx.driveFile.findUnique({
        where: { id: fileId },
        include: {
          node: { include: { space: true } },
          versions: { orderBy: { version: 'desc' }, take: 1 },
          bindings: { where: { active: true } },
        },
      });
      const node = file?.node;
      const version = file?.versions[0];
      if (
        !node ||
        node.deletedAt ||
        node.space.deletedAt ||
        node.space.type !== 'ORG' ||
        node.space.orgId !== project.orgId
      )
        throw new BadRequestException('封面必须是当前组织云盘中的文件');
      if (
        !version ||
        version.status !== 'ACTIVE' ||
        !version.contentType.startsWith('image/')
      )
        throw new BadRequestException('请选择已通过校验的图片');
      await this.acl.assertNodeAction(node, DriveAction.VIEW, auth);
      if (
        file.bindings.some(
          (binding) =>
            binding.targetType !== 'PROJECT' || binding.targetId !== project.id,
        )
      )
        throw new BadRequestException(
          '该文件已关联其他业务，请上传独立的项目封面',
        );
      let parentId: string | null = null;
      for (const name of ['项目资料', project.id, '封面']) {
        const folder: { id: string } | null = await tx.driveNode.findFirst({
          where: {
            spaceId: node.spaceId,
            parentId,
            name,
            type: 'FOLDER',
            deletedAt: null,
          },
        });
        const created: { id: string } =
          folder ??
          (await tx.driveNode.create({
            data: {
              spaceId: node.spaceId,
              parentId,
              name,
              type: 'FOLDER',
              createdById: auth.userId,
            },
          }));
        parentId = created.id;
      }
      await tx.driveNode.update({ where: { id: node.id }, data: { parentId } });
      await tx.driveFile.update({
        where: { id: fileId },
        data: { managedBy: 'SYSTEM' },
      });
      const key = {
        fileId,
        targetType: 'PROJECT' as const,
        targetId: project.id,
        fieldKey: 'image',
        purpose: 'COVER',
      };
      await tx.fileBinding.upsert({
        where: { fileId_targetType_targetId_fieldKey_purpose: key },
        create: key,
        update: { active: true },
      });
      if (
        !file.bindings.some(
          (binding) =>
            binding.targetType === 'PROJECT' &&
            binding.targetId === project.id &&
            binding.purpose === 'COVER',
        )
      ) {
        await tx.driveAuditLog.create({
          data: {
            spaceId: node.spaceId,
            nodeId: node.id,
            fileId,
            actorId: auth.userId,
            action: 'BIND',
            metadata: {
              targetType: 'PROJECT',
              targetId: project.id,
              purpose: 'COVER',
            },
          },
        });
      }
    }
    for (const binding of old) {
      await tx.fileBinding.update({
        where: { id: binding.id },
        data: { active: false },
      });
      const node = binding.file.node;
      if (node)
        await tx.driveAuditLog.create({
          data: {
            spaceId: node.spaceId,
            nodeId: node.id,
            fileId: binding.fileId,
            actorId: auth?.userId,
            action: 'UNBIND',
            metadata: {
              targetType: 'PROJECT',
              targetId: project.id,
              purpose: 'COVER',
            },
          },
        });
      if (
        !(await tx.fileBinding.count({
          where: { fileId: binding.fileId, active: true },
        }))
      )
        await tx.driveFile.update({
          where: { id: binding.fileId },
          data: { managedBy: 'USER' },
        });
    }
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

  async activeUserExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
      select: { id: true },
    });
    return Boolean(user);
  }

  async findOwnerOptions(options: {
    keyword: string;
  }): Promise<ProjectOwnerRecord[]> {
    const where: Prisma.UserWhereInput = {
      active: true,
      deletedAt: null,
      OR: [
        {
          username: {
            contains: options.keyword,
            mode: 'insensitive' as const,
          },
        },
        {
          email: {
            contains: options.keyword,
            mode: 'insensitive' as const,
          },
        },
        { phone: { contains: options.keyword } },
        {
          profile: {
            is: {
              displayName: {
                contains: options.keyword,
                mode: 'insensitive' as const,
              },
            },
          },
        },
        {
          profile: {
            is: {
              fullName: {
                contains: options.keyword,
                mode: 'insensitive' as const,
              },
            },
          },
        },
      ],
    };
    return this.prisma.user.findMany({
      where,
      take: 20,
      orderBy: [{ profile: { displayName: 'asc' } }, { createdAt: 'desc' }],
      select: PROJECT_OWNER_SELECT,
    });
  }

  async productExists(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    return Boolean(product);
  }
}
