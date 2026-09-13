import { PrismaService } from '@/prisma/prisma.service';
import { DriveAclService, DriveAuthContext } from '@/drive/policies';
import { ProjectRepository } from './project.repository';

describe('project cover persistence', () => {
  const auth = {
    userId: 'user',
    orgId: 'org',
    permissions: ['drive:read'],
  } as DriveAuthContext;
  function setup(orgId = 'org', image: string | null = 'drive://file/file') {
    const node = {
      id: 'node',
      spaceId: 'space',
      deletedAt: null,
      space: { type: 'ORG', orgId, deletedAt: null },
    };
    const tx = {
      project: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'project', orgId: 'org', image }),
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
      repository: new ProjectRepository(
        prisma as unknown as PrismaService,
        acl as unknown as DriveAclService,
      ),
    };
  }
  it('archives and binds a saved cover in the project transaction', async () => {
    const { tx, repository } = setup();
    await repository.update(
      'project',
      'org',
      { image: 'drive://file/file' },
      auth,
    );
    expect(
      tx.driveNode.create.mock.calls.map(
        ([arg]) => (arg as { data: { name: string } }).data.name,
      ),
    ).toEqual(['项目资料', 'project', '封面']);
    expect(tx.fileBinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          fileId: 'file',
          targetType: 'PROJECT',
          targetId: 'project',
          fieldKey: 'image',
          purpose: 'COVER',
        },
      }),
    );
    expect(tx.driveNode.update).toHaveBeenCalledWith({
      where: { id: 'node' },
      data: { parentId: 'folder' },
    });
  });
  it('rejects files in another organization before binding', async () => {
    const { tx, repository } = setup('other');
    await expect(
      repository.update('project', 'org', { image: 'drive://file/file' }, auth),
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
    await repository.update('project', 'org', { image: null }, auth);
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
