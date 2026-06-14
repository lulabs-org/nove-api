import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WechatShopModule } from '@/integrations/wechat-shop/wechat-shop.module';
import { OrderController } from './order.controller';
import { OrderRepository } from './repositories';
import { OrderService } from './service/order.service';

@Module({
  imports: [PrismaModule, WechatShopModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
