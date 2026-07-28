import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { wechatShopConfig } from '@/configs';
import { WechatShopController } from './controllers/wechat-shop.controller';
import { WechatShopEventController } from './controllers/wechat-shop-event.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopService } from './service/wechat-shop.service';
import { WechatShopEventService } from './service/wechat-shop-event.service';
import { WechatShopClientService } from './service/wechat-shop-client.service';
import { WechatShopTokenService } from './service/wechat-shop-token.service';

@Module({
  imports: [PrismaModule, ConfigModule.forFeature(wechatShopConfig)],
  controllers: [WechatShopController, WechatShopEventController],
  providers: [
    WechatShopService,
    WechatShopEventService,
    WechatShopRepository,
    WechatShopClientService,
    WechatShopTokenService,
  ],
  exports: [WechatShopService, WechatShopRepository],
})
export class WechatShopModule {}
