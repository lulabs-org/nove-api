import {
  FileScanProvider,
  FileVersionStatus,
  Prisma,
  UploadSessionStatus,
} from '@prisma/client';
import { FileScanRepository } from '../repositories';
import { FileScanService } from './file-scan.service';

describe('FileScanService', () => {
  const prisma = {
    fileVersion: {
      findUnique: jest.fn(),
      update: jest.fn<Promise<unknown>, [Prisma.FileVersionUpdateArgs]>(),
    },
    storageObject: { update: jest.fn() },
    uploadSession: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const systemConfig = { getConfig: jest.fn() };
  const aliyun = { scan: jest.fn() };
  const clamAv = { scan: jest.fn() };
  const queue = { add: jest.fn() };
  const service = new FileScanService(
    new FileScanRepository(prisma as never),
    systemConfig as never,
    aliyun as never,
    clamAv as never,
    queue as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.fileVersion.update.mockResolvedValue({});
    prisma.storageObject.update.mockResolvedValue({});
    prisma.uploadSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((operations) =>
      Promise.all(operations),
    );
  });

  it('defaults production scans to Alibaba Cloud', async () => {
    const previous = process.env.NODE_ENV;
    const previousProvider = process.env.DRIVE_MALWARE_SCAN_PROVIDER;
    process.env.NODE_ENV = 'production';
    delete process.env.DRIVE_MALWARE_SCAN_PROVIDER;
    systemConfig.getConfig.mockResolvedValue(null);
    await expect(service.resolveProvider(true)).resolves.toBe(
      FileScanProvider.ALIYUN_SAS,
    );
    await expect(service.resolveProvider(false)).resolves.toBe(
      FileScanProvider.POLICY_BYPASS,
    );
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    if (previousProvider === undefined)
      delete process.env.DRIVE_MALWARE_SCAN_PROVIDER;
    else process.env.DRIVE_MALWARE_SCAN_PROVIDER = previousProvider;
  });

  it('activates a verifying version only after a clean provider result', async () => {
    prisma.fileVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      status: FileVersionStatus.VERIFYING,
      scanProvider: FileScanProvider.ALIYUN_SAS,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100n,
      checksumSha256: 'a'.repeat(64),
      storageObjectId: 'object-1',
      storageObject: { objectKey: 'drive/report.pdf' },
    });
    aliyun.scan.mockResolvedValue({
      clean: true,
      checksumSha256: 'a'.repeat(64),
      details: { engine: 'aliyun-sas' },
    });

    await service.process('version-1');

    expect(aliyun.scan).toHaveBeenCalled();
    const activeUpdate = prisma.fileVersion.update.mock.lastCall?.[0] as {
      data: { status?: FileVersionStatus };
    };
    expect(activeUpdate.data.status).toBe(FileVersionStatus.ACTIVE);
    expect(prisma.uploadSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: UploadSessionStatus.ACTIVE },
      }),
    );
  });

  it('keeps downloads closed by rejecting an infected result', async () => {
    prisma.fileVersion.findUnique.mockResolvedValue({
      id: 'version-2',
      status: FileVersionStatus.VERIFYING,
      scanProvider: FileScanProvider.CLAMAV,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100n,
      checksumSha256: null,
      storageObjectId: 'object-2',
      storageObject: { objectKey: 'drive/report.pdf' },
    });
    clamAv.scan.mockResolvedValue({
      clean: false,
      checksumSha256: 'b'.repeat(64),
      details: { response: 'Eicar-Test-Signature FOUND' },
    });

    await service.process('version-2');

    const rejectedUpdate = prisma.fileVersion.update.mock.lastCall?.[0] as {
      data: {
        status?: FileVersionStatus;
        rejectionReason?: string | null;
      };
    };
    expect(rejectedUpdate.data).toMatchObject({
      status: FileVersionStatus.REJECTED,
      rejectionReason: '文件未通过病毒扫描',
    });
  });
});
