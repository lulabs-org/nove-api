import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: '订单状态',
    enum: OrderStatus,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
