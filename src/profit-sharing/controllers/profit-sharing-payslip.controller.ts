import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { ProfitSharingPayslipService } from '../services/profit-sharing-payslip.service';
import { CreatePayslipAdjustmentDto } from '../dto/payslip-adjustment.dto';

@ApiTags('月度工资条 (Payslips)')
@ApiBearerAuth()
@Controller('profit-sharing/payslips')
export class ProfitSharingPayslipController {
  constructor(private readonly payslipService: ProfitSharingPayslipService) {}

  @Get()
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取月度工资条汇总列表' })
  async getPayslips(
    @Query('month') month?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.payslipService.getPayslips({ month, keyword });
  }

  @Get('export')
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '导出月度工资条 CSV' })
  async exportPayslips(
    @Query('month') monthStr: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csvData = await this.payslipService.exportPayslipsCsv(monthStr);
    const filename = `payslip-${monthStr || 'current'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csvData;
  }

  @Get('historical-stats')
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取成员/全员过往各月薪资与分润统计数据（供看板统计图表使用）' })
  async getHistoricalSalaryStats(
    @Query('memberId') memberId?: string,
    @Query('months') months?: string,
  ) {
    return this.payslipService.getHistoricalSalaryStats({
      memberId: memberId || undefined,
      months: months ? parseInt(months, 10) : 6,
    });
  }

  @Get(':memberId/detail')
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取员工个人月度工资条明细凭据' })
  async getPayslipDetail(
    @Param('memberId') memberId: string,
    @Query('month') month?: string,
  ) {
    return this.payslipService.getPayslipDetail(memberId, month);
  }

  @Post('adjustments')
  @RequirePermissions('profit-sharing:create')
  @ApiOperation({ summary: '手工录入员工当月薪资调整项（各类奖金、津贴补贴、扣除项等）' })
  async createAdjustment(@Body() dto: CreatePayslipAdjustmentDto) {
    return this.payslipService.createAdjustment(dto);
  }

  @Post(':memberId/settle')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '一键结算该员工当月全部待发流水' })
  async settleMemberPayslip(
    @Param('memberId') memberId: string,
    @Query('month') month?: string,
  ) {
    return this.payslipService.settleMemberPayslip(memberId, month);
  }
}
