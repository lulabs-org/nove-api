import { FileScanProvider } from '@prisma/client';
import { FileScanningService } from './file-scanning.service';

describe('FileScanningService', () => {
  const configService = {
    getConfig: jest.fn(),
  };
  const aliyunScanner = {
    scan: jest.fn(),
  };
  const clamAvScanner = {
    scan: jest.fn(),
  };
  const service = new FileScanningService(
    configService as never,
    aliyunScanner as never,
    clamAvScanner as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveEffectiveProvider', () => {
    it('returns ALIYUN_SAS when configured in integration config', async () => {
      configService.getConfig.mockResolvedValue({
        malwareScanProvider: FileScanProvider.ALIYUN_SAS,
      });
      const provider = await service.resolveEffectiveProvider();
      expect(provider).toBe(FileScanProvider.ALIYUN_SAS);
    });

    it('returns CLAMAV when configured in integration config', async () => {
      configService.getConfig.mockResolvedValue({
        malwareScanProvider: FileScanProvider.CLAMAV,
      });
      const provider = await service.resolveEffectiveProvider();
      expect(provider).toBe(FileScanProvider.CLAMAV);
    });

    it('returns CLAMAV when clamAvHost is provided without explicit malwareScanProvider', async () => {
      configService.getConfig.mockResolvedValue({
        clamAvHost: '127.0.0.1',
      });
      const provider = await service.resolveEffectiveProvider();
      expect(provider).toBe(FileScanProvider.CLAMAV);
    });

    it('returns null when no scanning provider is configured', async () => {
      configService.getConfig.mockResolvedValue({});
      const provider = await service.resolveEffectiveProvider();
      expect(provider).toBeNull();
    });
  });

  describe('scan', () => {
    const mockInput = {
      objectKey: 'test/file.pdf',
      fileName: 'file.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024n,
      checksumSha256: 'a'.repeat(64),
    };

    it('routes scan to AliyunFileScannerService', async () => {
      aliyunScanner.scan.mockResolvedValue({
        clean: true,
        checksumSha256: 'a'.repeat(64),
        details: { engine: 'aliyun-sas' },
      });

      const result = await service.scan(mockInput, {
        provider: FileScanProvider.ALIYUN_SAS,
      });

      expect(aliyunScanner.scan).toHaveBeenCalledWith(mockInput);
      expect(result.clean).toBe(true);
      expect(result.details.engine).toBe('aliyun-sas');
    });

    it('routes scan to ClamAvFileScannerService', async () => {
      clamAvScanner.scan.mockResolvedValue({
        clean: false,
        details: { engine: 'clamav' },
      });

      const result = await service.scan(mockInput, {
        provider: FileScanProvider.CLAMAV,
      });

      expect(clamAvScanner.scan).toHaveBeenCalledWith(mockInput);
      expect(result.clean).toBe(false);
    });

    it('bypasses scan when provider is POLICY_BYPASS', async () => {
      const result = await service.scan(mockInput, {
        provider: FileScanProvider.POLICY_BYPASS,
      });

      expect(aliyunScanner.scan).not.toHaveBeenCalled();
      expect(clamAvScanner.scan).not.toHaveBeenCalled();
      expect(result.clean).toBe(true);
      expect(result.details.engine).toBe('bypass');
    });
  });
});
