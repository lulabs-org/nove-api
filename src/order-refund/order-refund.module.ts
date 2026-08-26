import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderRefundController } from './order-refund.controller';
import { OrderRefundRepository } from './order-refund.repository';
import { OrderRefundService } from './order-refund.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderRefundController],
  providers: [OrderRefundService, OrderRefundRepository],
  exports: [OrderRefundService],
})
export class OrderRefundModule {}
