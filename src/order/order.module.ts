import { Module } from '@nestjs/common';
import { PermissionGuard } from '@/common/guards';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderController } from './controllers/order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, PermissionGuard],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
