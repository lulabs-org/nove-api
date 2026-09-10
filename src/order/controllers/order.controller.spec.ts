/* eslint-disable @typescript-eslint/unbound-method */
import { OrderController } from './order.controller';
import { OrderService } from '../services/order.service';
import { OrderStatus } from '@prisma/client';

describe('OrderController', () => {
  let controller: OrderController;
  let service: jest.Mocked<OrderService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;
    controller = new OrderController(service);
  });

  it('delegates create to orderService.create', async () => {
    const dto = { orderNumber: 'ORD-001', amount: 1000 };
    service.create.mockResolvedValue({ id: 'order-1', ...dto } as never);

    const result = await controller.create(dto as never);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('order-1');
  });

  it('delegates findAll to orderService.findAll', async () => {
    const query = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ items: [], total: 0 } as never);

    const result = await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.total).toBe(0);
  });

  it('delegates findById to orderService.findById', async () => {
    service.findById.mockResolvedValue({ id: 'order-1' } as never);

    const result = await controller.findById('order-1');

    expect(service.findById).toHaveBeenCalledWith('order-1');
    expect(result.id).toBe('order-1');
  });

  it('delegates update to orderService.update', async () => {
    const dto = { amount: 2000 };
    service.update.mockResolvedValue({ id: 'order-1', amount: 2000 } as never);

    const result = await controller.update('order-1', dto as never);

    expect(service.update).toHaveBeenCalledWith('order-1', dto);
    expect(result.amount).toBe(2000);
  });

  it('delegates updateStatus to orderService.updateStatus', async () => {
    service.updateStatus.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
    } as never);

    const result = await controller.updateStatus('order-1', {
      status: OrderStatus.PAID,
    });

    expect(service.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.PAID,
    );
    expect(result.status).toBe(OrderStatus.PAID);
  });

  it('delegates delete to orderService.delete', async () => {
    service.delete.mockResolvedValue(undefined as never);

    await controller.delete('order-1');

    expect(service.delete).toHaveBeenCalledWith('order-1');
  });
});
