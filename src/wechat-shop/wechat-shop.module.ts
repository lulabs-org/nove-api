import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WechatShopController } from './controllers/wechat-shop.controller';
import { WechatShopEventController } from './controllers/wechat-shop-event.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopService } from './service/wechat-shop.service';
import { WechatShopOrderClientService } from './service/wechat-shop-order-client.service';

@Module({
  imports: [PrismaModule],
  controllers: [WechatShopController, WechatShopEventController],
  providers: [
    WechatShopService,
    WechatShopRepository,
    WechatShopOrderClientService,
  ],
  exports: [WechatShopService, WechatShopRepository],
})
export class WechatShopModule {}
