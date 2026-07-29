import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { wechatShopConfig } from '@/configs';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { WechatShopOrderController } from './controllers/wechat-shop-order.controller';
import { WechatShopEventController } from './controllers/wechat-shop-event.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopOrderService } from './service/wechat-shop-order.service';
import { WechatShopEventService } from './service/wechat-shop-event.service';
import { WechatShopAftersaleService } from './service/wechat-shop-aftersale.service';
import { WechatShopClientService } from './service/wechat-shop-client.service';
import { WechatShopTokenService } from './service/wechat-shop-token.service';
import { WechatShopProcessor } from './processor/wechat-shop.processor';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ConfigModule.forFeature(wechatShopConfig),
    BullModule.registerQueue({ name: 'wechat-order-sync' }),
    BullBoardModule.forFeature({
      name: 'wechat-order-sync',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [WechatShopOrderController, WechatShopEventController],
  providers: [
    WechatShopOrderService,
    WechatShopEventService,
    WechatShopAftersaleService,
    WechatShopRepository,
    WechatShopClientService,
    WechatShopTokenService,
    WechatShopProcessor,
  ],
  exports: [WechatShopOrderService, WechatShopRepository],
})
export class WechatShopModule {}
