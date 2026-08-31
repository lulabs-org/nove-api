export const DRIVE_SCAN_QUEUE = 'drive-file-scan';

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
