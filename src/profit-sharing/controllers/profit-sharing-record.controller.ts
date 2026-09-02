import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  async getRecords(@Query() query: Prisma.ProfitShareRecordWhereInput) {
    return this.recordService.getRecords(query);
  }
}
