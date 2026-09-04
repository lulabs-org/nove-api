import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FileScanProvider, FileVersionStatus, Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import { FileScanRepository } from '../repositories';
import { AliyunFileScannerService } from './aliyun-file-scanner.service';
import { ClamAvFileScannerService } from './clamav-file-scanner.service';
import { DRIVE_SCAN_QUEUE } from './file-scanner.types';

@Injectable()
export class FileScanService {
  constructor(
    private readonly scans: FileScanRepository,
    private readonly systemConfig: SystemConfigService,
    private readonly aliyun: AliyunFileScannerService,
    private readonly clamAv: ClamAvFileScannerService,
    @InjectQueue(DRIVE_SCAN_QUEUE) private readonly queue: Queue,
  ) {}

  async resolveProvider(requiresScan: boolean): Promise<FileScanProvider> {
    if (!requiresScan) return FileScanProvider.POLICY_BYPASS;
    const raw = (await this.systemConfig.getConfig('drive')) as
      | { value?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    const config = (raw?.value ?? raw ?? {}) as {
      malwareScanProvider?: 'ALIYUN_SAS' | 'CLAMAV';
    };
    if (config.malwareScanProvider) return config.malwareScanProvider;
    const environmentProvider = process.env.DRIVE_MALWARE_SCAN_PROVIDER?.trim();
    if (
      environmentProvider === FileScanProvider.ALIYUN_SAS ||
      environmentProvider === FileScanProvider.CLAMAV
    ) {
      return environmentProvider;
    }
    return process.env.NODE_ENV === 'production'
      ? FileScanProvider.ALIYUN_SAS
      : process.env.CLAMAV_HOST?.trim()
        ? FileScanProvider.CLAMAV
        : FileScanProvider.POLICY_BYPASS;
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
    const provider =
      version.scanProvider === FileScanProvider.ALIYUN_SAS
        ? this.aliyun
        : this.clamAv;
    const result = await provider.scan({
      objectKey: version.storageObject.objectKey,
      fileName: version.originalName,
      contentType: version.contentType,
      sizeBytes: version.sizeBytes,
      checksumSha256: version.checksumSha256,
    });
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
