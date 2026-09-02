import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { Prisma, ProfitShareRecordStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { ProfitSharingRecordService } from '../services/profit-sharing-record.service';

@ApiTags('分润明细流水 (Records)')
@ApiBearerAuth()
@Controller('profit-sharing/records')
export class ProfitSharingRecordController {
  constructor(private readonly recordService: ProfitSharingRecordService) {}

  @Get('dashboard-stats')
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取分润看板实时统计数据' })
  async getDashboardStats() {
    return this.recordService.getDashboardStats();
  }

  @Get()
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取分润明细流水列表' })
  async getRecords(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const page = pageStr ? Number(pageStr) : 1;
    const pageSize = pageSizeStr ? Number(pageSizeStr) : 10;
    const skip = Math.max(0, (page - 1) * pageSize);

    const where: Prisma.ProfitShareRecordWhereInput = {};
    if (status) {
      where.status = status as ProfitShareRecordStatus;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const { data, total } = await this.recordService.getRecords({ where, skip, take: pageSize });
    return { data, total, page, pageSize };
  }

  @Post(':id/settle')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '手动结算分润记录' })
  async settleRecord(@Param('id') id: string) {
    return this.recordService.settleRecord(id);
  }

  @Post(':id/undo-settle')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '撤销手动结算（恢复为待结算）' })
  async undoSettleRecord(@Param('id') id: string) {
    return this.recordService.undoSettleRecord(id);
  }

  @Post(':id/cancel')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '手动取消分润记录' })
  async cancelRecord(@Param('id') id: string) {
    return this.recordService.cancelRecord(id);
  }

  @Post(':id/restore')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '恢复被取消的分润记录' })
  async restoreRecord(@Param('id') id: string) {
    return this.recordService.restoreRecord(id);
  }
}
