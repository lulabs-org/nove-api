import { DataPermRepository } from '../repositories';
import { DataPermService } from './data-permission.service';
import { BadRequestException } from '@nestjs/common';

describe('DataPermService', () => {
  type CreateRuleData = {
    name: string;
    code: string;
    description?: string;
    resource: string;
    action?: string;
    condition: string;
    active?: boolean;
  };

  let repository: {
    create: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
  };
  let service: DataPermService;
  let createdData: CreateRuleData | undefined;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };
    createdData = undefined;
    service = new DataPermService(repository as unknown as DataPermRepository);
  });

  it('generates an immutable rule code instead of trusting a client value', async () => {
    repository.create.mockImplementation((data: CreateRuleData) => {
      createdData = data;
      return Promise.resolve({
        id: 'rule-1',
        description: null,
        createdAt: new Date('2026-09-22T00:00:00Z'),
        updatedAt: new Date('2026-09-22T00:00:00Z'),
        ...data,
      });
    });

    const result = await service.createDataPermRule({
      name: '订单仅本人负责',
      code: 'client_supplied_code',
      resource: 'order',
      condition: '{}',
      active: true,
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(createdData).toMatchObject({
      name: '订单仅本人负责',
      resource: 'order',
      condition: '{}',
      active: true,
    });
    expect(createdData?.code).toMatch(
      /^data_rule_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.code).not.toBe('client_supplied_code');
  });

  it('defaults action to * if omitted, or preserves custom action', async () => {
    repository.create.mockImplementation((data: CreateRuleData) => {
      createdData = data;
      return Promise.resolve({
        id: 'rule-2',
        description: null,
        createdAt: new Date('2026-09-22T00:00:00Z'),
        updatedAt: new Date('2026-09-22T00:00:00Z'),
        ...data,
      });
    });

    const res1 = await service.createDataPermRule({
      name: '默认全部操作',
      resource: 'order',
      condition: '{}',
    });
    expect(createdData?.action).toBe('*');
    expect(res1.action).toBe('*');

    const res2 = await service.createDataPermRule({
      name: '订单只读规则',
      resource: 'order',
      action: 'read',
      condition: '{}',
    });
    expect(createdData?.action).toBe('read');
    expect(res2.action).toBe('read');
  });

  it('rejects an invalid nested rule before writing it', async () => {
    await expect(
      service.createDataPermRule({
        name: '空 OR',
        resource: 'order',
        condition: '{"$or":[]}',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a resource change when the saved condition uses a field absent from orders', async () => {
    repository.findById.mockResolvedValue({
      id: 'rule-1',
      resource: 'user',
      action: '*',
      condition: '{"departmentId":"dept-1"}',
    });
    await expect(
      service.updateDataPermRule('rule-1', { resource: 'order' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates action correctly in updateDataPermRule', async () => {
    repository.findById.mockResolvedValue({
      id: 'rule-1',
      name: '旧规则',
      resource: 'order',
      action: '*',
      condition: '{}',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.update.mockResolvedValue({
      id: 'rule-1',
      name: '旧规则',
      resource: 'order',
      action: 'update',
      condition: '{}',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateDataPermRule('rule-1', {
      action: 'update',
    });

    expect(repository.update).toHaveBeenCalledWith(
      'rule-1',
      expect.objectContaining({
        action: 'update',
      }),
    );
    expect(result.action).toBe('update');
  });
});
