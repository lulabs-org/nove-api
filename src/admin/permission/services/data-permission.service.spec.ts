import { DataPermRepository } from '../repositories';
import { DataPermService } from './data-permission.service';

describe('DataPermService', () => {
  type CreateRuleData = {
    name: string;
    code: string;
    description?: string;
    resource: string;
    condition: string;
    active?: boolean;
  };

  let repository: {
    create: jest.Mock;
  };
  let service: DataPermService;
  let createdData: CreateRuleData | undefined;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
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
});
