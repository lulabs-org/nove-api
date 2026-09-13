/* eslint-disable @typescript-eslint/unbound-method */
import { OrderBenefitController } from './order-benefit.controller';
import { OrderService } from '../services/order.service';

describe('OrderBenefitController', () => {
  let controller: OrderBenefitController;
  let service: jest.Mocked<OrderService>;

  beforeEach(() => {
    service = {
      freeze: jest.fn(),
      unfreeze: jest.fn(),
      extend: jest.fn(),
      getBenefitAdjustments: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;
    controller = new OrderBenefitController(service);
  });

  it('delegates freeze call to orderService.freeze', async () => {
    service.freeze.mockResolvedValue({
      id: 'order-1',
      status: 'FROZEN',
    } as never);
    const dto = { reason: '学员生病请假' };

    const result = await controller.freeze('order-1', dto, 'user-1');

    expect(service.freeze).toHaveBeenCalledWith('order-1', dto, 'user-1');
    expect(result.status).toBe('FROZEN');
  });

  it('delegates unfreeze call to orderService.unfreeze', async () => {
    service.unfreeze.mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
    } as never);
    const dto = { reason: '销假恢复学习' };

    const result = await controller.unfreeze('order-1', dto, 'user-1');

    expect(service.unfreeze).toHaveBeenCalledWith('order-1', dto, 'user-1');
    expect(result.status).toBe('PAID');
  });

  it('delegates extend call to orderService.extend', async () => {
    service.extend.mockResolvedValue({
      id: 'order-1',
      benefitEnd: new Date('2027-02-01'),
    } as never);
    const dto = { days: 36, reason: '补偿延期' };

    const result = await controller.extend('order-1', dto, 'user-1');

    expect(service.extend).toHaveBeenCalledWith('order-1', dto, 'user-1');
    expect(result.id).toBe('order-1');
  });

  it('delegates getBenefitAdjustments call to orderService.getBenefitAdjustments', async () => {
    const adjustments = [
      {
        id: 'adj-1',
        orderId: 'order-1',
        type: 'FREEZE',
        frozenDays: 0,
      },
    ];
    service.getBenefitAdjustments.mockResolvedValue(adjustments as never);

    const result = await controller.getBenefitAdjustments('order-1');

    expect(service.getBenefitAdjustments).toHaveBeenCalledWith('order-1');
    expect(result).toEqual(adjustments);
  });
});
