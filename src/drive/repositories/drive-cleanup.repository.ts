import { Injectable } from '@nestjs/common';
import { FileVersionStatus, UploadSessionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DriveCleanupRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExpiredUploadSessions(now: Date, take = 200) {
    return this.prisma.uploadSession.findMany({
      where: {
        expiresAt: { lte: now },
        status: {
          in: [
            UploadSessionStatus.CREATED,
            UploadSessionStatus.UPLOADING,
            UploadSessionStatus.VERIFYING,
            UploadSessionStatus.REJECTED,
          ],
        },
      },
      take,
    });
  }

  rejectVerifyingVersions(objectKey: string, completedAt: Date) {
    return this.prisma.fileVersion.updateMany({
      where: {
        status: FileVersionStatus.VERIFYING,
        storageObject: { objectKey },
      },
      data: {
        status: FileVersionStatus.REJECTED,
        rejectionReason: '上传会话过期前未完成病毒扫描',
        scanCompletedAt: completedAt,
        scanResult: { error: 'scan-session-expired' },
      },
    });
  }

  expireUploadSession(id: string) {
    return this.prisma.uploadSession.update({
      where: { id },
      data: { status: UploadSessionStatus.EXPIRED },
    });
  }

  findTrashRoots(now: Date, take = 100) {
    return this.prisma.driveNode.findMany({
      where: { purgeAfter: { lte: now }, deletedAt: { not: null } },
      orderBy: { purgeAfter: 'asc' },
      take,
      select: { id: true, spaceId: true },
    });
  }

  findNode(id: string) {
    return this.prisma.driveNode.findUnique({ where: { id } });
  }

  countActiveBindings(fileIds: string[]) {
    return this.prisma.fileBinding.count({
      where: { fileId: { in: fileIds }, active: true },
    });
  }

  findVersions(fileIds: string[]) {
    return this.prisma.fileVersion.findMany({
      where: { fileId: { in: fileIds } },
      select: {
        storageObjectId: true,
        storageObject: { select: { objectKey: true } },
      },
    });
  }

  purgeGraph(data: {
    spaceId: string;
    rootId: string;
    nodeIdsInDeleteOrder: string[];
    fileIds: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.driveAuditLog.create({
        data: {
          spaceId: data.spaceId,
          nodeId: data.rootId,
          action: 'PURGE',
        },
      });
      await tx.fileBinding.deleteMany({
        where: { fileId: { in: data.fileIds } },
      });
      for (const nodeId of data.nodeIdsInDeleteOrder) {
        await tx.driveNode.delete({ where: { id: nodeId } });
      }
      await tx.fileVersion.deleteMany({
        where: { fileId: { in: data.fileIds } },
      });
      await tx.driveFile.deleteMany({
        where: { id: { in: data.fileIds } },
      });
    });
  }

  async collectDeletedSubtree(rootId: string) {
    const records: Array<{ id: string; fileId: string | null }> = [];
    let frontier = [rootId];
    while (frontier.length) {
      const batch = await this.prisma.driveNode.findMany({
        where: { id: { in: frontier }, deletedAt: { not: null } },
        select: { id: true, fileId: true },
      });
      records.push(...batch);
      const children = await this.prisma.driveNode.findMany({
        where: { parentId: { in: frontier }, deletedAt: { not: null } },
        select: { id: true },
      });
      frontier = children.map((child) => child.id);
    }
    return records;
  }

  async countStorageObjectReferences(storageObjectId: string) {
    const [versionReferences, minuteReferences] = await Promise.all([
      this.prisma.fileVersion.count({ where: { storageObjectId } }),
      this.prisma.minuteFile.count({
        where: { fileObjectId: storageObjectId, deletedAt: null },
      }),
    ]);
    return versionReferences + minuteReferences;
  }

  deleteStorageObject(id: string) {
    return this.prisma.storageObject.delete({ where: { id } });
  }
}
