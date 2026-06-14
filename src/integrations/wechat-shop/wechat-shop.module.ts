import { Module } from '@nestjs/common';
import { WechatShopService } from './services/wechat-shop.service';

@Module({
  providers: [WechatShopService],
  exports: [WechatShopService],
})
export class WechatShopModule {}
