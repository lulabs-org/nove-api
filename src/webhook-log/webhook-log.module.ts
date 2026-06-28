import { Module, Global } from '@nestjs/common';
import { WebhookLogService } from './webhook-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookLogController } from './webhook-log.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [WebhookLogController],
  providers: [WebhookLogService],
  exports: [WebhookLogService],
})
export class WebhookLogModule {}
