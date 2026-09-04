import { Injectable } from '@nestjs/common';
import { FileScanProvider, Prisma, UploadSessionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UploadSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    spaceId: string;
    parentId: string | null;
    createdById: string;
    fileName: string;
    declaredContentType: string;
    declaredSizeBytes: bigint;
    declaredChecksumSha256?: string;
    scanProvider: FileScanProvider;
    objectKey: string;
    providerUploadId: string;
    expiresAt: Date;
  }) {
    return this.prisma.uploadSession.create({ data });
  }

  findById(id: string) {
    return this.prisma.uploadSession.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.UploadSessionUpdateInput) {
    return this.prisma.uploadSession.update({ where: { id }, data });
  }

  markUploading(id: string) {
    return this.update(id, { status: UploadSessionStatus.UPLOADING });
  }

  markVerifying(id: string, completedParts: Prisma.InputJsonValue) {
    return this.update(id, {
      status: UploadSessionStatus.VERIFYING,
      completedParts,
    });
  }

  markRejected(id: string) {
    return this.update(id, { status: UploadSessionStatus.REJECTED });
  }

  markExpired(id: string) {
    return this.update(id, { status: UploadSessionStatus.EXPIRED });
  }
}
