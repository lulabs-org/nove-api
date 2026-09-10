import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  ExtendOrderDto,
  FreezeOrderDto,
  OrderBenefitAdjustmentDto,
  OrderDto,
  UnfreezeOrderDto,
} from '../dto';
import { OrderService } from '../services/order.service';

@ApiTags('Admin - Orders')
@Controller('admin/orders')
@ApiBearerAuth()
export class OrderBenefitController {
  constructor(private readonly orderService: OrderService) {}

  @Post(':id/freeze')
  @RequirePermissions('order:update')
  @ApiOperation({
    summary: '冻结订单权益',
    description: '暂停订单会员或课程权益，记录冻结流水并将状态置为 FROZEN',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单冻结成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效或订单不可冻结' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async freeze(
    @Param('id') id: string,
    @Body() dto: FreezeOrderDto,
    @Auth('userId') actorId?: string,
  ): Promise<OrderDto> {
    return this.orderService.freeze(id, dto, actorId);
  }

  @Post(':id/unfreeze')
  @RequirePermissions('order:update')
  @ApiOperation({
    summary: '解冻订单权益',
    description: '恢复订单权益并自动顺延到期日（benefitEnd），状态恢复为 PAID',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单解冻成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效或订单非冻结状态' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async unfreeze(
    @Param('id') id: string,
    @Body() dto: UnfreezeOrderDto,
    @Auth('userId') actorId?: string,
  ): Promise<OrderDto> {
    return this.orderService.unfreeze(id, dto, actorId);
  }

  @Post(':id/extend')
  @RequirePermissions('order:update')
  @ApiOperation({
    summary: '延期订单权益',
    description: '为订单直接增加指定天数的权益有效期，记录延期流水',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单延期成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效或延期天数非法' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async extend(
    @Param('id') id: string,
    @Body() dto: ExtendOrderDto,
    @Auth('userId') actorId?: string,
  ): Promise<OrderDto> {
    return this.orderService.extend(id, dto, actorId);
  }

  @Get(':id/benefit-adjustments')
  @RequirePermissions('order:read')
  @ApiOperation({
    summary: '获取订单权益调整历史',
    description: '查询订单的所有冻结、解冻与延期流水记录',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({
    status: 200,
    description: '权益调整流水列表',
    type: [OrderBenefitAdjustmentDto],
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async getBenefitAdjustments(
    @Param('id') id: string,
  ): Promise<OrderBenefitAdjustmentDto[]> {
    return this.orderService.getBenefitAdjustments(id);
  }
}
