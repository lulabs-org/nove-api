import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { ProfitSharingRuleService } from '../services/profit-sharing-rule.service';
import { ProfitSharingService } from '../services/profit-sharing.service';
import { CreateProfitShareRuleDto } from '../dto/create-profit-share-rule.dto';
import { UpdateProfitShareRuleDto } from '../dto/update-profit-share-rule.dto';

@ApiTags('分润规则 (Rules)')
@ApiBearerAuth()
@Controller('profit-sharing/rules')
export class ProfitSharingRuleController {
  constructor(
    private readonly ruleService: ProfitSharingRuleService,
    private readonly profitSharingService: ProfitSharingService,
  ) {}

  @Post()
  @RequirePermissions('profit-sharing:create')
  @ApiOperation({ summary: '创建分润规则' })
  async createRule(@Body() createDto: CreateProfitShareRuleDto) {
    return this.ruleService.createRule(createDto);
  }

  @Get()
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取分润规则列表' })
  async getRules() {
    return this.ruleService.getRules();
  }

  @Get(':id')
  @RequirePermissions('profit-sharing:read')
  @ApiOperation({ summary: '获取规则详情' })
  async getRuleById(@Param('id') id: string) {
    return this.ruleService.getRuleById(id);
  }

  @Put(':id')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '更新分润规则' })
  async updateRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateProfitShareRuleDto,
  ) {
    return this.ruleService.updateRule(id, updateDto);
  }

  @Post(':id/calculate')
  @RequirePermissions('profit-sharing:update')
  @ApiOperation({ summary: '根据该规则手动批量补算历史订单的分润' })
  async calculateForRule(@Param('id') id: string) {
    return this.profitSharingService.calculateForSpecificRule(id);
  }
}
