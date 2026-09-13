import { FileScanProvider } from '@/generated/prisma/client';

export interface FileScanInput {
  objectKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: bigint;
  checksumSha256?: string | null;
}

export interface FileScanResult {
  clean: boolean;
  checksumSha256?: string;
  details: Record<string, unknown>;
}

export interface FileScannerProvider {
  scan(input: FileScanInput): Promise<FileScanResult>;
}

export interface FileScanningConfig {
  malwareScanProvider?: FileScanProvider;
  aliyunSasRegionId?: string;
  scanTimeoutMs?: number;
  scanPollIntervalMs?: number;
  clamAvHost?: string;
  clamAvPort?: number;
  clamAvTimeoutMs?: number;
}
