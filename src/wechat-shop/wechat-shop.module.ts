import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WechatShopController } from './wechat-shop.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopService } from './service/wechat-shop.service';
import { WechatShopOrderClientService } from './service/wechat-shop-order-client.service';

@Module({
  imports: [PrismaModule],
  controllers: [WechatShopController],
  providers: [
    WechatShopService,
    WechatShopRepository,
    WechatShopOrderClientService,
  ],
  exports: [WechatShopService, WechatShopRepository],
})
export class WechatShopModule {}
