import { Injectable } from '@nestjs/common';
import {
  DriveAuditAction,
  DriveFileManagedBy,
  DriveNodeType,
  FileVersionStatus,
  FileScanProvider,
  Prisma,
  StorageProvider,
  UploadSessionStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { latestFileVersionInclude } from './drive-node.repository';

const driveFileDetailsInclude = {
  node: true,
  versions: {
    orderBy: { version: 'desc' as const },
    take: 1,
    include: { storageObject: true },
  },
  bindings: { where: { active: true } },
} satisfies Prisma.DriveFileInclude;

export type DriveFileDetails = Prisma.DriveFileGetPayload<{
  include: typeof driveFileDetailsInclude;
}>;

@Injectable()
export class DriveFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDetails(id: string) {
    return this.prisma.driveFile.findUnique({
      where: { id },
      include: driveFileDetailsInclude,
    });
  }

  findManagedBy(id: string) {
    return this.prisma.driveFile.findUnique({
      where: { id },
      select: { managedBy: true },
    });
  }

  countActiveBindingsForNodes(nodeIds: string[]) {
    return this.prisma.fileBinding.count({
      where: {
        active: true,
        file: { node: { id: { in: nodeIds } } },
      },
    });
  }

  countAccessibleMinutes(
    minuteIds: string[],
    orgId: string | null | undefined,
  ) {
    return this.prisma.minute.count({
      where: {
        id: { in: minuteIds },
        deletedAt: null,
        meeting: { orgId: orgId ?? '__NO_ORG__' },
      },
    });
  }

  createUploadedFileGraph(data: {
    uploadSessionId: string;
    spaceId: string;
    parentId: string | null;
    fileName: string;
    contentType: string;
    sizeBytes: bigint;
    checksumSha256: string | null;
    scanProvider: FileScanProvider;
    objectKey: string;
    storageProvider: StorageProvider;
    bucket: string;
    userId: string;
    initialStatus: FileVersionStatus;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const object = await tx.storageObject.create({
        data: {
          provider: data.storageProvider,
          bucket: data.bucket,
          objectKey: data.objectKey,
          contentType: data.contentType,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          createdBy: data.userId,
        },
      });
      const file = await tx.driveFile.create({
        data: {
          createdById: data.userId,
          managedBy: DriveFileManagedBy.USER,
        },
      });
      const version = await tx.fileVersion.create({
        data: {
          fileId: file.id,
          version: 1,
          storageObjectId: object.id,
          status: data.initialStatus,
          originalName: data.fileName,
          contentType: data.contentType,
          sizeBytes: data.sizeBytes,
          checksumSha256: data.checksumSha256,
          scanProvider: data.scanProvider,
          ...(data.scanProvider === FileScanProvider.POLICY_BYPASS
            ? {
                scanCompletedAt: new Date(),
                scanResult: {
                  reason: 'media-policy-bypass',
                  validation: 'size-content-type-magic-bytes',
                },
              }
            : {}),
        },
      });
      const node = await tx.driveNode.create({
        data: {
          spaceId: data.spaceId,
          parentId: data.parentId,
          type: DriveNodeType.FILE,
          name: data.fileName,
          fileId: file.id,
          createdById: data.userId,
        },
        include: latestFileVersionInclude,
      });
      await tx.uploadSession.update({
        where: { id: data.uploadSessionId },
        data: {
          status:
            data.initialStatus === FileVersionStatus.ACTIVE
              ? UploadSessionStatus.ACTIVE
              : UploadSessionStatus.VERIFYING,
        },
      });
      await tx.driveAuditLog.create({
        data: {
          spaceId: data.spaceId,
          nodeId: node.id,
          fileId: file.id,
          actorId: data.userId,
          action: DriveAuditAction.CREATE_FILE,
        },
      });
      return { node, versionId: version.id };
    });
  }
}
