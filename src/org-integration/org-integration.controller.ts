import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrgIntegrationService } from './org-integration.service';
import { CreateOrgIntegrationDto } from './dto/create-org-integration.dto';
import { UpdateOrgIntegrationDto } from './dto/update-org-integration.dto';
import { OrgIntegrationDto } from './dto/org-integration.dto';

@ApiTags('Admin / Organization Integrations')
@ApiBearerAuth()
@Controller('orgs/:orgId/integrations')
export class OrgIntegrationController {
  constructor(private readonly orgIntegrationService: OrgIntegrationService) {}

  @Post()
  @ApiOperation({ summary: '添加组织集成配置' })
  @ApiParam({ name: 'orgId', description: '组织ID' })
  @ApiResponse({ status: 201, description: '创建成功', type: OrgIntegrationDto })
  create(
    @Param('orgId') orgId: string,
    @Body() createOrgIntegrationDto: CreateOrgIntegrationDto,
  ) {
    return this.orgIntegrationService.create(orgId, createOrgIntegrationDto);
  }

  @Get()
  @ApiOperation({ summary: '获取组织所有集成配置' })
  @ApiParam({ name: 'orgId', description: '组织ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: [OrgIntegrationDto] })
  findAll(@Param('orgId') orgId: string) {
    return this.orgIntegrationService.findAll(orgId);
  }

  @Get(':platform')
  @ApiOperation({ summary: '获取组织指定平台集成配置' })
  @ApiParam({ name: 'orgId', description: '组织ID' })
  @ApiParam({ name: 'platform', description: '平台标识 (e.g. LARK)' })
  @ApiResponse({ status: 200, description: '获取成功', type: OrgIntegrationDto })
  findOne(
    @Param('orgId') orgId: string,
    @Param('platform') platform: string,
  ) {
    return this.orgIntegrationService.findOne(orgId, platform);
  }

  @Patch(':platform')
  @ApiOperation({ summary: '更新组织指定平台集成配置' })
  @ApiParam({ name: 'orgId', description: '组织ID' })
  @ApiParam({ name: 'platform', description: '平台标识' })
  @ApiResponse({ status: 200, description: '更新成功', type: OrgIntegrationDto })
  update(
    @Param('orgId') orgId: string,
    @Param('platform') platform: string,
    @Body() updateOrgIntegrationDto: UpdateOrgIntegrationDto,
  ) {
    return this.orgIntegrationService.update(orgId, platform, updateOrgIntegrationDto);
  }

  @Delete(':platform')
  @ApiOperation({ summary: '删除组织指定平台集成配置' })
  @ApiParam({ name: 'orgId', description: '组织ID' })
  @ApiParam({ name: 'platform', description: '平台标识' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(
    @Param('orgId') orgId: string,
    @Param('platform') platform: string,
  ) {
    return this.orgIntegrationService.remove(orgId, platform);
  }
}
