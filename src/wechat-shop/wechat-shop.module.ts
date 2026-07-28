import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { wechatShopConfig } from '@/configs';
import { BullModule } from '@nestjs/bullmq';
import { WechatShopController } from './controllers/wechat-shop.controller';
import { WechatShopEventController } from './controllers/wechat-shop-event.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopOrderService } from './service/wechat-shop-order.service';
import { WechatShopEventService } from './service/wechat-shop-event.service';
import { WechatShopClientService } from './service/wechat-shop-client.service';
import { WechatShopTokenService } from './service/wechat-shop-token.service';
import { WechatShopProcessor } from './processor/wechat-shop.processor';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(wechatShopConfig),
    BullModule.registerQueue({ name: 'wechat-order-sync' }),
  ],
  controllers: [WechatShopController, WechatShopEventController],
  providers: [
    WechatShopOrderService,
    WechatShopEventService,
    WechatShopRepository,
    WechatShopClientService,
    WechatShopTokenService,
    WechatShopProcessor,
  ],
  exports: [WechatShopOrderService, WechatShopRepository],
})
export class WechatShopModule {}
