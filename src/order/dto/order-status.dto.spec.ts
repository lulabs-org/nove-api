import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './create-order.dto';
import { QueryOrderDto } from './query-order.dto';
import { UpdateOrderStatusDto } from './update-order-status.dto';
import { UpdateOrderDto } from './update-order.dto';

const statusDtos: Array<[string, ClassConstructor<object>]> = [
  ['CreateOrderDto', CreateOrderDto],
  ['UpdateOrderDto', UpdateOrderDto],
  ['QueryOrderDto', QueryOrderDto],
  ['UpdateOrderStatusDto', UpdateOrderStatusDto],
];

async function statusValidationErrors(
  Dto: ClassConstructor<object>,
  status: string,
) {
  const errors = await validate(plainToInstance(Dto, { status }));
  return errors.filter((error) => error.property === 'status');
}

describe('order status DTO validation', () => {
  it('exposes the supported order lifecycle statuses', () => {
    expect(Object.values(OrderStatus)).toEqual([
      'UNPAID',
      'PAID',
      'FROZEN',
      'CANCELLED',
      'COMPLETED',
    ]);
  });

  it.each(statusDtos)(
    '%s accepts every current order status',
    async (_name, Dto) => {
      for (const status of Object.values(OrderStatus)) {
        await expect(statusValidationErrors(Dto, status)).resolves.toHaveLength(
          0,
        );
      }
    },
  );

  it.each(statusDtos)(
    '%s rejects the removed REFUNDED status',
    async (_name, Dto) => {
      await expect(
        statusValidationErrors(Dto, 'REFUNDED'),
      ).resolves.toHaveLength(1);
    },
  );
});
