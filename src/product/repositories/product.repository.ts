import { DriveAclService, DriveAuthContext } from '@/drive/policies';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DriveAction, Prisma, Product } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acl: DriveAclService,
  ) {}

  create(
    data: Prisma.ProductUncheckedCreateInput,
    auth?: DriveAuthContext,
  ): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data });
      await this.syncMedia(tx, product, 'imageUrl', auth);
      await this.syncMedia(tx, product, 'videoUrl', auth);
      return product;
    });
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findByCode(productCode: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { productCode } });
  }

  async findMany(options: {
    skip: number;
    take: number;
    where: Prisma.ProductWhereInput;
    orderBy: Prisma.ProductOrderByWithRelationInput[];
  }): Promise<{ items: Product[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.product.findMany(options),
      this.prisma.product.count({ where: options.where }),
    ]);
    return { items, total };
  }

  update(
    id: string,
    data: Prisma.ProductUncheckedUpdateInput,
    auth?: DriveAuthContext,
  ): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data });
      if (data.imageUrl !== undefined)
        await this.syncMedia(tx, product, 'imageUrl', auth);
      if (data.videoUrl !== undefined)
        await this.syncMedia(tx, product, 'videoUrl', auth);
      return product;
    });
  }

  private async syncMedia(
    tx: Prisma.TransactionClient,
    product: Product,
    field: 'imageUrl' | 'videoUrl',
    auth?: DriveAuthContext,
  ) {
    const purpose = field === 'imageUrl' ? 'PRODUCT_IMAGE' : 'PRODUCT_VIDEO';
    const fileId = product[field]?.match(
      /^drive:\/\/file\/([a-zA-Z0-9_-]+)$/,
    )?.[1];
    const scope = {
      targetType: 'PRODUCT' as const,
      targetId: product.id,
      purpose,
      active: true,
    };
    const old = await tx.fileBinding.findMany({
      where: { ...scope, ...(fileId ? { fileId: { not: fileId } } : {}) },
      include: { file: { include: { node: true } } },
    });
    if (fileId) {
      if (!auth?.orgId)
        throw new ForbiddenException('绑定产品媒体需要用户身份');
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
        node.space.orgId !== auth.orgId
      )
        throw new BadRequestException('媒体必须是当前组织云盘中的文件');
      if (
        !version ||
        version.status !== 'ACTIVE' ||
        !version.contentType.startsWith(
          field === 'imageUrl' ? 'image/' : 'video/',
        )
      )
        throw new BadRequestException('请选择已通过校验且类型正确的媒体文件');
      await this.acl.assertNodeAction(node, DriveAction.VIEW, auth);
      if (
        file.bindings.some(
          (binding) =>
            binding.targetType !== 'PRODUCT' || binding.targetId !== product.id,
        )
      )
        throw new BadRequestException(
          '该文件已关联其他业务，请上传独立的产品媒体',
        );
      let parentId: string | null = null;
      for (const name of [
        '产品资料',
        product.id,
        field === 'imageUrl' ? '图片' : '视频',
      ]) {
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
      const collision = await tx.driveNode.findFirst({
        where: {
          spaceId: node.spaceId,
          parentId,
          name: { equals: node.name, mode: 'insensitive' },
          deletedAt: null,
          id: { not: node.id },
        },
      });
      await tx.driveNode.update({
        where: { id: node.id },
        data: {
          parentId,
          ...(collision
            ? { name: `${node.name.slice(0, 180)} (${fileId})` }
            : {}),
        },
      });
      await tx.driveFile.update({
        where: { id: fileId },
        data: { managedBy: 'SYSTEM' },
      });
      const key = {
        fileId,
        targetType: 'PRODUCT' as const,
        targetId: product.id,
        fieldKey: field,
        purpose,
      };
      await tx.fileBinding.upsert({
        where: { fileId_targetType_targetId_fieldKey_purpose: key },
        create: key,
        update: { active: true },
      });
      if (
        !file.bindings.some(
          (binding) =>
            binding.targetType === 'PRODUCT' &&
            binding.targetId === product.id &&
            binding.purpose === purpose,
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
              targetType: 'PRODUCT',
              targetId: product.id,
              purpose,
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
              targetType: 'PRODUCT',
              targetId: product.id,
              purpose,
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

  delete(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }
}
