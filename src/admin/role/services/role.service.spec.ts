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
});
