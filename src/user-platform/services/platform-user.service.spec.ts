import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PlatformUserService } from './platform-user.service';
import { PlatformUserRepository } from '../repositories/platform-user.repository';

describe('PlatformUserService', () => {
  let service: PlatformUserService;
  let repository: {
    findById: jest.Mock;
    update: jest.Mock;
    updateLastSeen: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    deleteById: jest.Mock;
  };

  const platformUser = {
    id: 'platform-user-id',
    platform: 'FEISHU',
    ptUnionId: 'union-id',
    active: true,
  };

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      updateLastSeen: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      deleteById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformUserService,
        {
          provide: PlatformUserRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PlatformUserService>(PlatformUserService);
    repository = module.get(PlatformUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a platform user when findById succeeds', async () => {
    repository.findById.mockResolvedValue(platformUser);

    await expect(service.findById(platformUser.id)).resolves.toEqual(
      platformUser,
    );
    expect(repository.findById).toHaveBeenCalledWith(platformUser.id);
  });

  it.each([
    ['update', (id: string) => service.update(id, { displayName: 'next' })],
    ['updateLastSeen', (id: string) => service.updateLastSeen(id)],
    ['activate', (id: string) => service.activate(id)],
    ['deactivate', (id: string) => service.deactivate(id)],
    ['deleteById', (id: string) => service.deleteById(id)],
  ])(
    'throws NotFoundException when %s targets a missing record',
    async (_, fn) => {
      repository.findById.mockResolvedValue(null);

      await expect(fn('missing-id')).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith('missing-id');
    },
  );

  it.each([
    [
      'update',
      'update',
      (id: string) => service.update(id, { displayName: 'next' }),
    ],
    [
      'updateLastSeen',
      'updateLastSeen',
      (id: string) => service.updateLastSeen(id),
    ],
    ['activate', 'activate', (id: string) => service.activate(id)],
    ['deactivate', 'deactivate', (id: string) => service.deactivate(id)],
    ['deleteById', 'deleteById', (id: string) => service.deleteById(id)],
  ])('calls repository.%s after existence check', async (_, method, fn) => {
    repository.findById.mockResolvedValue(platformUser);
    repository[method as keyof typeof repository].mockResolvedValue(
      platformUser,
    );

    await expect(fn(platformUser.id)).resolves.toEqual(platformUser);
    expect(repository.findById).toHaveBeenCalledWith(platformUser.id);
    expect(repository[method as keyof typeof repository]).toHaveBeenCalled();
  });
});
