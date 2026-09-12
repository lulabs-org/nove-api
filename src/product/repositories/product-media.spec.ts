import { PrismaService } from '@/prisma/prisma.service';
import { DriveAclService, DriveAuthContext } from '@/drive/policies';
import { ProductRepository } from './product.repository';

describe('product cover persistence', () => {
  const auth = {
    userId: 'user',
    orgId: 'org',
    permissions: ['drive:read'],
  } as DriveAuthContext;
  function setup(orgId = 'org', imageUrl: string | null = 'drive://file/file') {
    const node = {
      id: 'node',
      name: 'cover.png',
      spaceId: 'space',
      deletedAt: null,
      space: { type: 'ORG', orgId, deletedAt: null },
    };
    const tx = {
      product: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'product', orgId: 'org', imageUrl }),
      },
      driveFile: {
        findUnique: jest.fn().mockResolvedValue({
          node,
          versions: [{ status: 'ACTIVE', contentType: 'image/png' }],
          bindings: [],
        }),
        update: jest.fn(),
      },
      driveNode: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'folder' }),
        update: jest.fn(),
      },
      fileBinding: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      driveAuditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const acl = { assertNodeAction: jest.fn().mockResolvedValue(undefined) };
    return {
      tx,
      repository: new ProductRepository(
        prisma as unknown as PrismaService,
        acl as unknown as DriveAclService,
      ),
    };
  }
  it('archives and binds a saved cover in the product transaction', async () => {
    const { tx, repository } = setup();
    await repository.update('product', { imageUrl: 'drive://file/file' }, auth);
    expect(
      tx.driveNode.create.mock.calls.map(
        ([arg]) => (arg as { data: { name: string } }).data.name,
      ),
    ).toEqual(['产品资料', 'product', '图片']);
    expect(tx.fileBinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          fileId: 'file',
          targetType: 'PRODUCT',
          targetId: 'product',
          fieldKey: 'imageUrl',
          purpose: 'PRODUCT_IMAGE',
        },
      }),
    );
    expect(tx.driveNode.update).toHaveBeenCalledWith({
      where: { id: 'node' },
      data: { parentId: 'folder' },
    });
  });
  it('archives video in the video directory with a separate binding', async () => {
    const { tx, repository } = setup();
    tx.product.update.mockResolvedValue({
      id: 'product',
      videoUrl: 'drive://file/video',
    });
    tx.driveFile.findUnique.mockResolvedValue({
      node: {
        id: 'node',
        spaceId: 'space',
        space: { type: 'ORG', orgId: 'org' },
      },
      versions: [{ status: 'ACTIVE', contentType: 'video/mp4' }],
      bindings: [],
    });
    await repository.update(
      'product',
      { videoUrl: 'drive://file/video' },
      auth,
    );
    expect(tx.fileBinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          fileId: 'video',
          targetType: 'PRODUCT',
          fieldKey: 'videoUrl',
          purpose: 'PRODUCT_VIDEO',
          targetId: 'product',
        },
      }),
    );
    expect(
      tx.driveNode.create.mock.calls.map(
        ([arg]) => (arg as { data: { name: string } }).data.name,
      ),
    ).toEqual(['产品资料', 'product', '视频']);
  });
  it('keeps a same-name archived file when replacing the image', async () => {
    const { tx, repository } = setup();
    tx.driveNode.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'old-node' });
    await repository.update('product', { imageUrl: 'drive://file/file' }, auth);
    expect(tx.driveNode.update).toHaveBeenCalledWith({
      where: { id: 'node' },
      data: { parentId: 'folder', name: 'cover.png (file)' },
    });
  });
  it('rejects an image selected for a video field', async () => {
    const { tx, repository } = setup();
    tx.product.update.mockResolvedValue({
      id: 'product',
      videoUrl: 'drive://file/file',
    });
    await expect(
      repository.update('product', { videoUrl: 'drive://file/file' }, auth),
    ).rejects.toThrow('类型正确');
    expect(tx.fileBinding.upsert).not.toHaveBeenCalled();
  });
  it('rejects files in another organization before binding', async () => {
    const { tx, repository } = setup('other');
    await expect(
      repository.update('product', { imageUrl: 'drive://file/file' }, auth),
    ).rejects.toThrow('当前组织');
    expect(tx.fileBinding.upsert).not.toHaveBeenCalled();
  });
  it('unlinks a removed cover without deleting the file', async () => {
    const { tx, repository } = setup('org', null);
    tx.fileBinding.findMany.mockResolvedValue([
      {
        id: 'binding',
        fileId: 'old',
        file: { node: { id: 'node', spaceId: 'space' } },
      },
    ]);
    await repository.update('product', { imageUrl: null }, auth);
    expect(tx.fileBinding.update).toHaveBeenCalledWith({
      where: { id: 'binding' },
      data: { active: false },
    });
    expect(tx.driveFile.update).toHaveBeenCalledWith({
      where: { id: 'old' },
      data: { managedBy: 'USER' },
    });
  });
});
