import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { WechatShopOrderController } from './controllers/wechat-shop-order.controller';
import { WechatShopEventController } from './controllers/wechat-shop-event.controller';
import { WechatShopRepository } from './repositories';
import { WechatShopOrderService } from './services/wechat-shop-order.service';
import { WechatShopEventService } from './services/wechat-shop-event.service';
import { WechatShopAftersaleService } from './services/wechat-shop-aftersale.service';
import { WechatShopClientService } from './services/wechat-shop-client.service';
import { WechatShopTokenService } from './services/wechat-shop-token.service';
import { WechatShopProcessor } from './processor/wechat-shop.processor';
import { UserModule } from '@/user/user.module';
import { WechatShopTesterService } from './wechat-shop.tester';
import { IntegrationsModule } from '@/admin/integrations';
import { TasksModule } from '@/task/tasks.module';
import { WechatShopSyncScheduleService } from './services/wechat-shop-sync-schedule.service';
import { WechatShopSyncScheduleHandler } from './services/wechat-shop-sync-schedule.handler';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    UserModule,
    BullModule.registerQueue({ name: 'wechat-order-sync' }),
    BullBoardModule.forFeature({
      name: 'wechat-order-sync',
      adapter: BullMQAdapter,
    }),
    IntegrationsModule,
    TasksModule,
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
    WechatShopTesterService,
    WechatShopSyncScheduleService,
    WechatShopSyncScheduleHandler,
  ],
  exports: [WechatShopOrderService, WechatShopRepository],
})
export class WechatShopModule {}
