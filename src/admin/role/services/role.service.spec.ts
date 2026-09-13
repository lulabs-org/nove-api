import { RoleService } from './role.service';
import type { RoleRepository } from '../repositories/role.repository';

describe('RoleService', () => {
  it('lists roles by permission level with a stable tie-breaker', async () => {
    const findMany = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const roleRepository = {
      findMany,
    } as unknown as jest.Mocked<RoleRepository>;
    const service = new RoleService(roleRepository);

    await service.findAll({ page: 1, pageSize: 100 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ level: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });
  it.each(['org-1', 'org-2'])(
    'only unbinds members in the requested organization: %s',
    async (orgId) => {
      const repository = {
        findRoleBindingById: jest.fn().mockResolvedValue({
          id: 'binding-1',
          role: { code: 'MENTOR' },
          deletedAt: null,
          member: { orgId: 'org-1', deletedAt: null },
        }),
        deleteRoleBinding: jest.fn().mockResolvedValue(undefined),
      };
      const service = new RoleService(repository as unknown as RoleRepository);
      if (orgId === 'org-1') {
        await service.deleteRoleBinding(orgId, 'binding-1');
        expect(repository.deleteRoleBinding).toHaveBeenCalledWith('binding-1');
      } else {
        await expect(
          service.deleteRoleBinding(orgId, 'binding-1'),
        ).rejects.toThrow('Role binding not found');
        expect(repository.deleteRoleBinding).not.toHaveBeenCalled();
      }
    },
  );
  it('rejects removing a super administrator without deleting the binding', async () => {
    const repository = {
      findRoleBindingById: jest.fn().mockResolvedValue({
        id: 'binding-1',
        deletedAt: null,
        role: { code: 'SUPER_ADMIN' },
        member: { orgId: 'org-1', deletedAt: null },
      }),
      deleteRoleBinding: jest.fn(),
    };
    const service = new RoleService(repository as unknown as RoleRepository);
    await expect(
      service.deleteRoleBinding('org-1', 'binding-1'),
    ).rejects.toThrow('超级管理员受保护，不允许移除');
    expect(repository.deleteRoleBinding).not.toHaveBeenCalled();
  });
});
