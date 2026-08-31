import { Injectable } from '@nestjs/common';
import { FileVersionStatus, Prisma, UploadSessionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FileScanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVersionForScan(id: string) {
    return this.prisma.fileVersion.findUnique({
      where: { id },
      include: { storageObject: true },
    });
  }

  markStarted(id: string, startedAt: Date) {
    return this.prisma.fileVersion.update({
      where: { id },
      data: { scanAttempts: { increment: 1 }, scanStartedAt: startedAt },
    });
  }

  findStatus(id: string) {
    return this.prisma.fileVersion.findUnique({
      where: { id },
      select: { status: true },
    });
  }

  completeScan(data: {
    versionId: string;
    storageObjectId: string;
    objectKey: string;
    status: FileVersionStatus;
    checksumSha256?: string;
    scanResult: Prisma.InputJsonValue;
    scanCompletedAt: Date;
    rejectionReason: string | null;
  }) {
    return this.prisma.$transaction([
      this.prisma.fileVersion.update({
        where: { id: data.versionId },
        data: {
          status: data.status,
          checksumSha256: data.checksumSha256,
          scanResult: data.scanResult,
          scanCompletedAt: data.scanCompletedAt,
          rejectionReason: data.rejectionReason,
        },
      }),
      ...(data.checksumSha256
        ? [
            this.prisma.storageObject.update({
              where: { id: data.storageObjectId },
              data: { checksumSha256: data.checksumSha256 },
            }),
          ]
        : []),
      this.prisma.uploadSession.updateMany({
        where: {
          objectKey: data.objectKey,
          status: UploadSessionStatus.VERIFYING,
        },
        data: {
          status:
            data.status === FileVersionStatus.ACTIVE
              ? UploadSessionStatus.ACTIVE
              : UploadSessionStatus.REJECTED,
        },
      }),
    ]);
  }

  findVerifyingVersion(id: string) {
    return this.prisma.fileVersion.findFirst({
      where: { id, status: FileVersionStatus.VERIFYING },
      select: {
        id: true,
        storageObject: { select: { objectKey: true } },
      },
    });
  }

  rejectFailedScan(data: {
    versionId: string;
    objectKey: string;
    completedAt: Date;
    error: string;
  }) {
    return this.prisma.$transaction([
      this.prisma.fileVersion.update({
        where: { id: data.versionId },
        data: {
          status: FileVersionStatus.REJECTED,
          rejectionReason: '病毒扫描服务不可用',
          scanCompletedAt: data.completedAt,
          scanResult: { error: data.error },
        },
      }),
      this.prisma.uploadSession.updateMany({
        where: {
          objectKey: data.objectKey,
          status: UploadSessionStatus.VERIFYING,
        },
        data: { status: UploadSessionStatus.REJECTED },
      }),
    ]);
  }
}
