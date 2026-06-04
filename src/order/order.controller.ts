import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatOrderHistorySyncDto } from './dto/wechat-order-history-sync.dto';
import { WechatOrderIncrementalSyncDto } from './dto/wechat-order-incremental-sync.dto';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';
import { OrderService } from './service/order.service';
import { OrderSyncService } from './service/order-sync.service';

@ApiTags('Orders')
@Controller('webhooks/wechat/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderSyncService: OrderSyncService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive mapped WeChat order fields',
    description: '接收飞书集成平台转换后的订单字段，并写入 orders 表。',
  })
  @ApiBody({
    type: WechatOrderWebhookDto,
  })
  @ApiResponse({ status: 200, description: '订单写入成功' })
  async receiveWechatOrder(@Body() payload: WechatOrderWebhookDto) {
    const result = await this.orderService.upsertWechatOrder(payload);

    return {
      success: true,
      action: result.action,
      orderId: result.order.id,
      orderCode: result.order.orderCode,
      orderNumber: result.order.orderNumber,
      externalId: result.order.externalId,
    };
  }

  @Public()
  @Post('history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enqueue historical WeChat shop order sync',
    description:
      '创建微信小店历史订单同步任务。任务会在后台按 7 天时间片分页同步，并记录游标用于失败后恢复。',
  })
  @ApiBody({
    type: WechatOrderHistorySyncDto,
  })
  @ApiResponse({ status: 200, description: '历史订单同步任务已创建' })
  async syncWechatOrderHistory(@Body() payload: WechatOrderHistorySyncDto) {
    const job = await this.orderSyncService.enqueueWechatHistorySync(payload);

    return {
      success: true,
      job,
    };
  }

  @Public()
  @Post('incremental-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enqueue incremental WeChat shop order sync',
    description:
      '按 update_time_range 创建增量同步任务，默认拉最近 2 小时变化，用重叠窗口兜底订单状态变化和 webhook 丢失。',
  })
  @ApiBody({
    type: WechatOrderIncrementalSyncDto,
  })
  @ApiResponse({ status: 200, description: '增量订单同步任务已创建' })
  async syncWechatOrderIncremental(
    @Body() payload: WechatOrderIncrementalSyncDto,
  ) {
    const job =
      await this.orderSyncService.enqueueWechatIncrementalSync(payload);

    return {
      success: true,
      job,
    };
  }

  @Public()
  @Post('sync-jobs/:jobId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resume a WeChat order sync job',
    description: '从 order_sync_jobs 表记录的当前时间片和 next_key 继续同步。',
  })
  @ApiResponse({ status: 200, description: '订单同步任务已重新入队' })
  async resumeWechatOrderSync(@Param('jobId') jobId: string) {
    const job = await this.orderSyncService.resumeWechatSyncJob(jobId);

    return {
      success: true,
      job,
    };
  }

  @Public()
  @Get('sync-jobs/:jobId')
  @ApiOperation({
    summary: 'Get a WeChat order sync job',
    description: '查询订单同步任务进度、游标和错误信息。',
  })
  @ApiResponse({ status: 200, description: '订单同步任务详情' })
  async getWechatOrderSyncJob(@Param('jobId') jobId: string) {
    const job = await this.orderSyncService.getWechatSyncJob(jobId);

    return {
      success: true,
      job,
    };
  }
}
