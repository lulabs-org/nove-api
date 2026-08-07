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
import { WechatShopOrderService } from './services/wechat-shop-order.service';
import { WechatShopEventService } from './services/wechat-shop-event.service';
import { WechatShopClientService } from './services/wechat-shop-client.service';
import { WechatShopTokenService } from './services/wechat-shop-token.service';
import { WechatShopProcessor } from './processor/wechat-shop.processor';
import { UserModule } from '@/user/user.module';

import { SystemConfigModule } from '@/admin/system-config/system-config.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    UserModule,
    ConfigModule.forFeature(wechatShopConfig),
    BullModule.registerQueue({ name: 'wechat-order-sync' }),
    BullBoardModule.forFeature({
      name: 'wechat-order-sync',
      adapter: BullMQAdapter,
    }),
    SystemConfigModule,
  ],
  controllers: [WechatShopOrderController, WechatShopEventController],
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
