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
import { AuthContext } from '@/auth/types/auth-context.interface';
import {
  CreateOrderDto,
  OrderDto,
  OrderListResponse,
  QueryOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../dto';
import { OrderService } from '../services/order.service';

@ApiTags('Admin / Orders')
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
  async create(
    @Body() dto: CreateOrderDto,
    @Auth() auth?: AuthContext,
  ): Promise<OrderDto> {
    return this.orderService.create(dto, auth);
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
  async findAll(
    @Query() query: QueryOrderDto,
    @Auth() auth?: AuthContext,
  ): Promise<OrderListResponse> {
    return this.orderService.findAll(query, auth);
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
  async findById(
    @Param('id') id: string,
    @Auth() auth?: AuthContext,
  ): Promise<OrderDto> {
    return this.orderService.findById(id, auth);
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
    @Auth() auth?: AuthContext,
  ): Promise<OrderDto> {
    return this.orderService.update(id, dto, auth);
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
    @Auth() auth?: AuthContext,
  ): Promise<OrderDto> {
    return this.orderService.updateStatus(id, dto.status, auth);
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
  async delete(
    @Param('id') id: string,
    @Auth() auth?: AuthContext,
  ): Promise<void> {
    return this.orderService.delete(id, auth);
  }
}
