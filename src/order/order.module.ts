import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderSyncProcessor } from './processors/order-sync.processor';
import { OrderRepository } from './repositories';
import { OrderService } from './service/order.service';
import { OrderIncrementalSyncScheduler } from './service/order-incremental-sync.scheduler';
import {
  ORDER_SYNC_QUEUE,
  OrderSyncService,
} from './service/order-sync.service';
import { WechatShopOrderClientService } from './service/wechat-shop-order-client.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: ORDER_SYNC_QUEUE,
    }),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderSyncService,
    OrderIncrementalSyncScheduler,
    OrderSyncProcessor,
    OrderRepository,
    WechatShopOrderClientService,
  ],
  exports: [OrderService, OrderSyncService, OrderRepository],
})
export class OrderModule {}
