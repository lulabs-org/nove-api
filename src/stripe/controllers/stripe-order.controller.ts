import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { RequireRoles } from '@/admin/role/decorators/roles.decorator';
import { StripeOrderHistorySyncDto, StripeRefundHistorySyncDto } from '../dto';
import { StripeOrderSyncService } from '../services/stripe-order-sync.service';
import { StripeRefundSyncService } from '../services/stripe-refund-sync.service';

@ApiTags('Stripe')
@ApiBearerAuth()
@Controller('stripe')
export class StripeOrderController {
  constructor(
    private readonly stripeOrderSyncService: StripeOrderSyncService,
    private readonly stripeRefundSyncService: StripeRefundSyncService,
  ) {}

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('orders/history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical Stripe orders',
    description:
      '后台异步拉取指定时间段内的 Stripe 历史交易并分发至 BullMQ 队列切片入库。',
  })
  @ApiBody({ type: StripeOrderHistorySyncDto })
  @ApiResponse({ status: 200, description: '历史订单同步任务下发完成' })
  async syncOrderHistory(@Body() payload: StripeOrderHistorySyncDto) {
    const result = await this.stripeOrderSyncService.syncHistory(payload);
    return {
      success: true,
      result,
    };
  }

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('orders/sync/:externalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync single Stripe order',
    description:
      '按需单笔同步指定的 Stripe PaymentIntent (pi_xxx)、CheckoutSession (cs_xxx) 或 Charge (ch_xxx)。',
  })
  @ApiParam({
    name: 'externalId',
    description: 'Stripe 外部编号（如 pi_xxx 或 cs_xxx）',
    example: 'pi_3MtwxAEkGgahJuga1V3npDWK',
  })
  @ApiResponse({ status: 200, description: '单笔订单同步成功' })
  async syncSingleOrder(@Param('externalId') externalId: string) {
    const result = await this.stripeOrderSyncService.syncSingle(externalId);
    return {
      success: true,
      result,
    };
  }

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('refunds/history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical Stripe refunds',
    description:
      '后台异步拉取指定时间段内的 Stripe 历史退款记录并分发至 BullMQ 队列切片入库。',
  })
  @ApiBody({ type: StripeRefundHistorySyncDto })
  @ApiResponse({ status: 200, description: '历史退款同步任务下发完成' })
  async syncRefundHistory(@Body() payload: StripeRefundHistorySyncDto) {
    const result = await this.stripeRefundSyncService.syncHistory(payload);
    return {
      success: true,
      result,
    };
  }

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('refunds/sync/:refundId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync single Stripe refund',
    description: '按需单笔同步指定的 Stripe 退款单 (re_xxx)。',
  })
  @ApiParam({
    name: 'refundId',
    description: 'Stripe 退款编号（如 re_xxx）',
    example: 're_1MtwyBEkGgahJugaV63x03gA',
  })
  @ApiResponse({ status: 200, description: '单笔退款同步成功' })
  async syncSingleRefund(@Param('refundId') refundId: string) {
    const result = await this.stripeRefundSyncService.syncSingle(refundId);
    return {
      success: true,
      result,
    };
  }
}
