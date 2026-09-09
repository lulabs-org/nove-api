import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Patch,
  Query,
} from '@nestjs/common';
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
  CreateOrderDto,
  ExtendOrderDto,
  FreezeOrderDto,
  OrderBenefitAdjustmentDto,
  OrderDto,
  OrderListResponse,
  QueryOrderDto,
  UnfreezeOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../dto';
import { OrderService } from '../services/order.service';

@ApiTags('Admin - Orders')
@Controller('admin/orders')
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @RequirePermissions('order:create')
  @ApiOperation({
    summary: '创建订单',
    description: '创建新的订单记录',
  })
  @ApiResponse({ status: 201, description: '订单创建成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  async create(@Body() dto: CreateOrderDto): Promise<OrderDto> {
    return this.orderService.create(dto);
  }

  @Get()
  @RequirePermissions('order:read')
  @ApiOperation({
    summary: '订单列表',
    description: '获取订单列表，支持分页、关键词、状态、渠道和时间筛选',
  })
  @ApiResponse({
    status: 200,
    description: '订单列表',
    type: OrderListResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async findAll(@Query() query: QueryOrderDto): Promise<OrderListResponse> {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('order:read')
  @ApiOperation({
    summary: '订单详情',
    description: '根据 ID 获取订单详情',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单详情', type: OrderDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async findById(@Param('id') id: string): Promise<OrderDto> {
    return this.orderService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('order:update')
  @ApiOperation({
    summary: '更新订单',
    description: '更新订单基础信息、金额、状态、支付信息和关联信息',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单更新成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderDto> {
    return this.orderService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('order:status')
  @ApiOperation({
    summary: '更新订单状态',
    description: '单独更新订单状态',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 200, description: '订单状态更新成功', type: OrderDto })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    return this.orderService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @RequirePermissions('order:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除订单',
    description: '软删除订单',
  })
  @ApiParam({ name: 'id', description: '订单 ID' })
  @ApiResponse({ status: 204, description: '订单删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.orderService.delete(id);
  }

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
