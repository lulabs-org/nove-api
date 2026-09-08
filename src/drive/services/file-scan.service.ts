import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FileScanProvider, FileVersionStatus, Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import { FileScanningService } from '@/file-scanning';
import { FileScanRepository } from '../repositories';
import { DRIVE_SCAN_QUEUE } from '../constants';

@Injectable()
export class FileScanService {
  constructor(
    private readonly scans: FileScanRepository,
    private readonly fileScanning: FileScanningService,
    @InjectQueue(DRIVE_SCAN_QUEUE) private readonly queue: Queue,
  ) {}

  async resolveProvider(requiresScan: boolean): Promise<FileScanProvider> {
    if (!requiresScan) return FileScanProvider.POLICY_BYPASS;
    const provider = await this.fileScanning.resolveEffectiveProvider();
    return provider ?? FileScanProvider.POLICY_BYPASS;
  }

  async enqueue(fileVersionId: string): Promise<void> {
    await this.queue.add(
      'scan',
      { fileVersionId },
      {
        jobId: fileVersionId,
        attempts: 4,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 },
      },
    );
  }

  async process(fileVersionId: string): Promise<void> {
    const version = await this.scans.findVersionForScan(fileVersionId);
    if (!version || version.status !== FileVersionStatus.VERIFYING) return;

    await this.scans.markStarted(version.id, new Date());
    const result = await this.fileScanning.scan(
      {
        objectKey: version.storageObject.objectKey,
        fileName: version.originalName,
        contentType: version.contentType,
        sizeBytes: version.sizeBytes,
        checksumSha256: version.checksumSha256,
      },
      { provider: version.scanProvider },
    );
    const current = await this.scans.findStatus(version.id);
    if (current?.status !== FileVersionStatus.VERIFYING) return;
    const checksumMatches =
      !version.checksumSha256 ||
      !result.checksumSha256 ||
      version.checksumSha256 === result.checksumSha256;
    const clean = result.clean && checksumMatches;
    const status = clean
      ? FileVersionStatus.ACTIVE
      : FileVersionStatus.REJECTED;
    const completedAt = new Date();
    await this.scans.completeScan({
      versionId: version.id,
      storageObjectId: version.storageObjectId,
      objectKey: version.storageObject.objectKey,
      status,
      checksumSha256:
        result.checksumSha256 ?? version.checksumSha256 ?? undefined,
      scanResult: {
        ...result.details,
        checksumMatches,
      } as Prisma.InputJsonValue,
      scanCompletedAt: completedAt,
      rejectionReason: clean
        ? null
        : checksumMatches
          ? '文件未通过病毒扫描'
          : '文件 SHA-256 与上传声明不一致',
    });
  }

  async markFailed(fileVersionId: string, error: unknown): Promise<void> {
    const message =
      error instanceof Error ? error.message : '病毒扫描服务暂时不可用';
    const version = await this.scans.findVerifyingVersion(fileVersionId);
    if (!version) return;
    await this.scans.rejectFailedScan({
      versionId: version.id,
      objectKey: version.storageObject.objectKey,
      completedAt: new Date(),
      error: message,
    });
  }
}
