/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Channel } from '@prisma/client';
import { ChannelRepository } from '../repositories/channel.repository';
import { ChannelService } from './channel.service';

describe('ChannelService', () => {
  let service: ChannelService;
  let repository: jest.Mocked<ChannelRepository>;

  const now = new Date('2026-08-13T00:00:00.000Z');
  const channel = (
    overrides: Partial<Channel & { orderCount: number }> = {},
  ): Channel & { orderCount: number } => ({
    id: 1,
    name: '微信小程序',
    code: 'WECHAT_MINIPROGRAM',
    description: null,
    isActive: true,
    orderCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ChannelRepository>;
    service = new ChannelService(repository);
  });

  it('creates a normalized channel', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockImplementation((data) =>
      Promise.resolve(
        channel({
          name: data.name,
          code: data.code,
          description: data.description as string | null,
          isActive: data.isActive as boolean,
        }),
      ),
    );

    const result = await service.create({
      name: ' 微信小程序 ',
      code: ' wechat_miniprogram ',
      description: ' 微信渠道 ',
    });

    expect(repository.create).toHaveBeenCalledWith({
      name: '微信小程序',
      code: 'WECHAT_MINIPROGRAM',
      description: '微信渠道',
      isActive: true,
    });
    expect(result.code).toBe('WECHAT_MINIPROGRAM');
  });

  it('builds searchable and active-state list filters', async () => {
    repository.findMany.mockResolvedValue({ items: [channel()], total: 1 });

    const result = await service.findAll({
      page: 2,
      pageSize: 20,
      keyword: '微信',
      isActive: true,
      sortField: 'name',
      sortOrder: 'asc',
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      where: expect.objectContaining({
        isActive: true,
        OR: expect.any(Array),
      }),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 20 });
  });

  it('rejects a duplicate channel code', async () => {
    repository.findByCode.mockResolvedValue(channel());

    await expect(
      service.create({ name: '重复渠道', code: 'wechat_miniprogram' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents deleting a channel referenced by orders', async () => {
    repository.findById.mockResolvedValue(channel({ orderCount: 3 }));

    await expect(service.delete(1)).rejects.toThrow(
      'Channel is referenced by orders and cannot be deleted',
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('rejects operations for a missing channel', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
