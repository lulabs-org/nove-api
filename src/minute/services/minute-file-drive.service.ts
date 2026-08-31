import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriveAuditAction,
  DriveFileManagedBy,
  DriveNodeType,
  DriveSpaceType,
  FileBindingTargetType,
  FileVersionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DriveService } from '@/drive/services/drive.service';
import { DriveAuthContext } from '@/drive/services/drive-policy.service';
import { AttachMinuteFileDto } from '../dto/minute-file.dto';

function recordId(value: unknown): string {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string'
  ) {
    throw new Error('expected a database record id');
  }
  return value.id;
}

@Injectable()
export class MinuteFileDriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService,
  ) {}

  async list(minuteId: string, orgId?: string) {
    await this.requireMinute(minuteId, orgId);
    const files = await this.prisma.minuteFile.findMany({
      where: { minuteId, deletedAt: null, fileBindingId: { not: null } },
      orderBy: { createdAt: 'asc' },
      include: {
        fileBinding: {
          include: {
            file: {
              include: {
                node: true,
                versions: {
                  where: { status: FileVersionStatus.ACTIVE },
                  orderBy: { version: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    return files.map((item) => {
      const file = item.fileBinding!.file;
      const version = file.versions[0];
      return {
        id: item.id,
        minuteId: item.minuteId,
        fileType: item.fileType,
        durationMs: item.durationMs?.toString() ?? null,
        resolution: item.resolution,
        fileId: file.id,
        nodeId: file.node?.id ?? null,
        name: file.node?.name ?? version?.originalName ?? '未命名文件',
        contentType: version?.contentType ?? null,
        sizeBytes: version?.sizeBytes.toString() ?? null,
        status: version?.status ?? null,
        createdAt: item.createdAt,
      };
    });
  }

  async attach(
    minuteId: string,
    dto: AttachMinuteFileDto,
    auth: DriveAuthContext,
    orgId: string,
  ) {
    const minute = await this.requireMinute(minuteId, orgId);
    await this.driveService.getFile(dto.fileId, auth);

    const file = await this.prisma.driveFile.findUnique({
      where: { id: dto.fileId },
      include: {
        node: { include: { space: true } },
        versions: {
          where: { status: FileVersionStatus.ACTIVE },
          orderBy: { version: 'desc' },
          take: 1,
        },
        bindings: { where: { active: true } },
      },
    });
    if (!file?.node || !file.versions[0]) {
      throw new NotFoundException('云盘文件或活动版本不存在');
    }
    if (
      file.node.space.type !== DriveSpaceType.ORG ||
      file.node.space.orgId !== orgId
    ) {
      throw new ForbiddenException('Minute 文件必须位于当前组织空间');
    }
    if (
      file.managedBy === DriveFileManagedBy.SYSTEM &&
      file.bindings.some(
        (binding) =>
          binding.targetType !== FileBindingTargetType.MINUTE ||
          binding.targetId !== minuteId,
      )
    ) {
      throw new ConflictException('系统文件已绑定其他业务实体');
    }

    const purpose = dto.fileType;
    const existing = await this.prisma.fileBinding.findUnique({
      where: {
        fileId_targetType_targetId_fieldKey_purpose: {
          fileId: file.id,
          targetType: FileBindingTargetType.MINUTE,
          targetId: minuteId,
          fieldKey: '',
          purpose,
        },
      },
      include: { minuteFile: true },
    });
    if (existing?.minuteFile && existing.active) return existing.minuteFile;

    const targetParentId = await this.ensureMeetingFolder(
      file.node.spaceId,
      minute.meetingId!,
      minute.meeting!.startAt ?? minute.createdAt,
    );
    const duplicate = await this.prisma.driveNode.findFirst({
      where: {
        spaceId: file.node.spaceId,
        parentId: targetParentId,
        deletedAt: null,
        name: { equals: file.node.name, mode: 'insensitive' },
        id: { not: file.node.id },
      },
    });
    if (duplicate) throw new ConflictException('会议资料目录已存在同名文件');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const binding = existing
          ? await tx.fileBinding.update({
              where: { id: existing.id },
              data: { active: true },
            })
          : await tx.fileBinding.create({
              data: {
                fileId: file.id,
                targetType: FileBindingTargetType.MINUTE,
                targetId: minuteId,
                purpose,
              },
            });
        await tx.driveFile.update({
          where: { id: file.id },
          data: { managedBy: DriveFileManagedBy.SYSTEM },
        });
        await tx.driveNode.update({
          where: { id: file.node!.id },
          data: { parentId: targetParentId },
        });
        const minuteFile = await tx.minuteFile.create({
          data: {
            minuteId,
            fileObjectId: file.versions[0].storageObjectId,
            fileBindingId: binding.id,
            fileType: dto.fileType,
            durationMs: dto.durationMs,
            resolution: dto.resolution,
          },
        });
        await tx.driveAuditLog.create({
          data: {
            spaceId: file.node!.spaceId,
            nodeId: file.node!.id,
            fileId: file.id,
            actorId: auth.userId,
            action: DriveAuditAction.BIND,
            metadata: { targetType: 'MINUTE', targetId: minuteId },
          },
        });
        return minuteFile;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.fileBinding.findUnique({
          where: {
            fileId_targetType_targetId_fieldKey_purpose: {
              fileId: file.id,
              targetType: FileBindingTargetType.MINUTE,
              targetId: minuteId,
              fieldKey: '',
              purpose,
            },
          },
          include: { minuteFile: true },
        });
        if (concurrent?.active && concurrent.minuteFile) {
          return concurrent.minuteFile;
        }
      }
      throw error;
    }
  }

  private async requireMinute(minuteId: string, orgId?: string) {
    const minute = await this.prisma.minute.findFirst({
      where: {
        id: minuteId,
        deletedAt: null,
        ...(orgId ? { meeting: { orgId, deletedAt: null } } : {}),
      },
      include: { meeting: true },
    });
    if (!minute || !minute.meetingId || !minute.meeting) {
      throw new NotFoundException('Minute 不存在或未关联会议');
    }
    return minute;
  }

  private async ensureMeetingFolder(
    spaceId: string,
    meetingId: string,
    occurredAt: Date,
  ): Promise<string> {
    const year = String(occurredAt.getUTCFullYear());
    const month = String(occurredAt.getUTCMonth() + 1).padStart(2, '0');
    let parentId: string | null = null;
    for (const name of ['会议资料', year, month, meetingId]) {
      const found: unknown = await this.prisma.driveNode.findFirst({
        where: {
          spaceId,
          parentId,
          type: DriveNodeType.FOLDER,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (found) {
        parentId = recordId(found);
        continue;
      }
      try {
        const created: unknown = await this.prisma.driveNode.create({
          data: {
            spaceId,
            parentId,
            type: DriveNodeType.FOLDER,
            name,
            createdById: null,
          },
        });
        parentId = recordId(created);
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        parentId = (
          await this.prisma.driveNode.findFirstOrThrow({
            where: {
              spaceId,
              parentId,
              type: DriveNodeType.FOLDER,
              deletedAt: null,
              name: { equals: name, mode: 'insensitive' },
            },
          })
        ).id;
      }
    }
    return parentId!;
  }
}
