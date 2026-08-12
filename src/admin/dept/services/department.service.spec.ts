import { DepartmentService } from './department.service';
import { DepartmentRepository } from '../repositories/department.repository';

/* eslint-disable @typescript-eslint/unbound-method */

describe('DepartmentService', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByOrgIdAndCode: jest.fn(),
    findCodesByOrganizationId: jest.fn(),
    isEligibleLeader: jest.fn(),
  } as unknown as jest.Mocked<DepartmentRepository>;

  const service = new DepartmentService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates the next department code when one is not supplied', async () => {
    repository.findCodesByOrganizationId.mockResolvedValue([
      'TECH',
      'DEPT-0002',
      'DEPT-0010',
    ]);
    repository.create.mockResolvedValue({
      id: 'dept-1',
      name: '产品部',
      code: 'DEPT-0011',
      description: null,
      orgId: 'org-1',
      parentId: null,
      leaderUserId: null,
      level: 1,
      sortOrder: 0,
      active: true,
      createdAt: new Date('2026-08-05T00:00:00Z'),
      updatedAt: new Date('2026-08-05T00:00:00Z'),
      deletedAt: null,
    });

    const result = await service.createDepartment('org-1', {
      name: '产品部',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'DEPT-0011',
        name: '产品部',
      }),
    );
    expect(result.code).toBe('DEPT-0011');
  });
});
