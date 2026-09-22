import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { OrderBenefitController } from './controllers/order-benefit.controller';
import { OrderController } from './controllers/order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';

import { OrderAbilityFactory } from './security/order-ability.factory';
import { OrderPolicyService } from './security/order-policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController, OrderBenefitController],
  providers: [
    OrderService,
    OrderRepository,
    OrderAbilityFactory,
    OrderPolicyService,
  ],
  exports: [OrderService, OrderRepository, OrderPolicyService],
})
export class OrderModule {}
