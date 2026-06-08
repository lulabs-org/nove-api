import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderRepository } from './repositories';
import { OrderService } from './service/order.service';
import { WechatShopOrderClientService } from './service/wechat-shop-order-client.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, WechatShopOrderClientService],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
