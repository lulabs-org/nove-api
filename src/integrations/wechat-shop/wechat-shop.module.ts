import { Module } from '@nestjs/common';
import { RedisModule } from '@/redis/redis.module';
import { WechatShopService } from './services/wechat-shop.service';

@Module({
  imports: [RedisModule],
  providers: [WechatShopService],
  exports: [WechatShopService],
})
export class WechatShopModule {}
