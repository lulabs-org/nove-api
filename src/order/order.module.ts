import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { OrderBenefitController } from './controllers/order-benefit.controller';
import { OrderController } from './controllers/order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController, OrderBenefitController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
