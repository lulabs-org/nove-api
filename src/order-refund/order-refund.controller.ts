import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  CreateOrderRefundDto,
  OrderRefundDto,
  OrderRefundListResponse,
  QueryOrderRefundDto,
  UpdateOrderRefundDto,
  UpdateRefundStatusDto,
} from './dto';
import { OrderRefundService } from './order-refund.service';

@ApiTags('Admin - Order Refunds')
@ApiBearerAuth()
@Controller('admin/order-refunds')
export class OrderRefundController {
  constructor(private readonly service: OrderRefundService) {}

  @Post()
  @RequirePermissions('order-refund:create')
  @ApiOperation({ summary: '登记退款售后' })
  @ApiResponse({ status: 201, type: OrderRefundDto })
  create(
    @Body() dto: CreateOrderRefundDto,
    @Auth('userId') actorId?: string,
  ): Promise<OrderRefundDto> {
    return this.service.create(dto, actorId);
  }

  @Get()
  @RequirePermissions('order-refund:read')
  @ApiOperation({ summary: '查询退款售后列表' })
  @ApiResponse({ status: 200, type: OrderRefundListResponse })
  findAll(
    @Query() query: QueryOrderRefundDto,
  ): Promise<OrderRefundListResponse> {
    return this.service.findAll(query);
  }

  @Get('preview-calculation')
  @RequirePermissions('order-refund:read')
  @ApiOperation({
    summary: '预估退款权益使用天数与建议金额',
    description: '根据订单实际冻结天数，精确推导实际权益消耗天数及建议退款金额',
  })
  @ApiQuery({ name: 'orderId', required: true, description: '订单 ID' })
  @ApiQuery({
    name: 'applyAt',
    required: false,
    description: '申请时间（默认当前时间）',
  })
  async previewCalculation(
    @Query('orderId') orderId: string,
    @Query('applyAt') applyAt?: string,
  ) {
    return this.service.previewBenefitCalculation(orderId, applyAt);
  }

  @Get(':id')
  @RequirePermissions('order-refund:read')
  @ApiOperation({ summary: '查询退款售后详情' })
  findById(@Param('id') id: string): Promise<OrderRefundDto> {
    return this.service.findById(id);
  }

  @Put(':id')
  @RequirePermissions('order-refund:update')
  @ApiOperation({ summary: '编辑退款售后' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderRefundDto,
  ): Promise<OrderRefundDto> {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('order-refund:settle')
  @ApiOperation({ summary: '更新退款结算状态' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRefundStatusDto,
  ): Promise<OrderRefundDto> {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('order-refund:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '软删除退款售后' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}
