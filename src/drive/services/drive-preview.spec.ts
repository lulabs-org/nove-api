import { Test, TestingModule } from '@nestjs/testing';
import { DriveAction, DriveAuditAction } from '@prisma/client';
import { OBJECT_STORAGE } from '@/storage/object-storage.interface';
import { DriveService } from './drive.service';
import { DriveConfigService } from './drive-config.service';
import { DriveAclService, DriveAuthContext } from '../policies';
import { DriveAccessRepository, DriveFileRepository } from '../repositories';

describe('Drive image preview audit', () => {
  let module: TestingModule;
  let service: DriveService;
  const auth: DriveAuthContext = {
    userId: 'user-a',
    orgId: 'org-a',
    permissions: ['drive:read'],
    authMethod: 'jwt',
  };
  const record = {
    id: 'file-a',
    managedBy: 'USER',
    bindings: [],
    node: {
      id: 'node-a',
      spaceId: 'space-a',
      name: 'cover.svg',
      deletedAt: null,
    },
    versions: [
      {
        status: 'ACTIVE',
        contentType: 'image/svg+xml',
        storageObject: { objectKey: 'cover-key' },
      },
    ],
  };
  const files = { findDetails: jest.fn() };
  const access = { createAudit: jest.fn() };
  const acl = {
    assertNodeAction: jest.fn(),
    requireUserId: jest.fn().mockReturnValue('user-a'),
  };
  const storage = {
    getDownloadUrl: jest.fn().mockReturnValue('https://storage.test/cover'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    files.findDetails.mockResolvedValue(structuredClone(record));
    acl.assertNodeAction.mockResolvedValue(undefined);
    module = await Test.createTestingModule({ providers: [DriveService] })
      .useMocker((token) => {
        if (token === DriveFileRepository) return files;
        if (token === DriveAccessRepository) return access;
        if (token === DriveAclService) return acl;
        if (token === OBJECT_STORAGE) return storage;
        if (token === DriveConfigService)
          return { getConfig: jest.fn().mockResolvedValue({}) };
        return {};
      })
      .compile();
    service = module.get(DriveService);
  });
  afterEach(async () => module.close());

  it('repeated image previews keep access checks without download audits', async () => {
    await service.createPreviewUrl('file-a', auth);
    const result = await service.createPreviewUrl('file-a', auth);
    expect(result.contentDisposition).toBe('inline');
    expect(acl.assertNodeAction).toHaveBeenCalledWith(
      record.node,
      DriveAction.DOWNLOAD,
      auth,
    );
    expect(acl.assertNodeAction).toHaveBeenCalledTimes(2);
    expect(access.createAudit).not.toHaveBeenCalled();
    expect(storage.getDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ contentDisposition: 'inline' }),
    );
  });

  it('previews videos without download audits', async () => {
    files.findDetails.mockResolvedValue({
      ...record,
      versions: [{ ...record.versions[0], contentType: 'video/mp4' }],
    });
    const result = await service.createPreviewUrl('file-a', auth);
    expect(result.contentDisposition).toBe('inline');
    expect(access.createAudit).not.toHaveBeenCalled();
  });
  it('explicit downloads still write DOWNLOAD audits', async () => {
    await service.createDownloadUrl('file-a', auth);
    expect(access.createAudit).toHaveBeenCalledTimes(1);
    expect(access.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: DriveAuditAction.DOWNLOAD,
        fileId: 'file-a',
      }),
    );
    expect(storage.getDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ contentDisposition: 'attachment' }),
    );
  });

  it('does not sign a URL when access is denied', async () => {
    acl.assertNodeAction.mockRejectedValueOnce(new Error('denied'));
    await expect(service.createPreviewUrl('file-a', auth)).rejects.toThrow(
      'denied',
    );
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['pending images', { status: 'PENDING', contentType: 'image/png' }],
    ['non-images', { status: 'ACTIVE', contentType: 'application/pdf' }],
  ])('rejects previews for %s', async (_name, version) => {
    files.findDetails.mockResolvedValue({
      ...record,
      versions: [{ ...record.versions[0], ...version }],
    });
    await expect(service.createPreviewUrl('file-a', auth)).rejects.toThrow();
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
    expect(access.createAudit).not.toHaveBeenCalled();
  });
});
