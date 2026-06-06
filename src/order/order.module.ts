import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderRepository } from './repositories';
import { OrderService } from './service/order.service';
import { OrderIncrementalSyncScheduler } from './service/order-incremental-sync.scheduler';
import { WechatShopOrderClientService } from './service/wechat-shop-order-client.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderIncrementalSyncScheduler,
    OrderRepository,
    WechatShopOrderClientService,
  ],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
