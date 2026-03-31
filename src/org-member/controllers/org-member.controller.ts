import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OrgMemberService } from '../services/org-member.service';
import {
  CreateOrgMemberDto,
  UpdateOrgMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberDepartmentsDto,
  BatchImportMemberDto,
  PaginationDto,
  OrgMemberDetailDto,
  OrgMemberListResponse,
  BatchImportResponse,
} from '../dto';

@ApiTags('Admin - OrgMembers')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrgMemberController {
  constructor(private readonly orgMemberService: OrgMemberService) {}

  @Post('orgs/:orgId/members')
  @ApiOperation({
    summary: '新增成员',
    description: '在指定组织下新增成员（绑定已有用户）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 201,
    description: '成员创建成功',
    type: OrgMemberDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async createMember(
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.createMember(orgId, dto);
  }

  @Get('orgs/:orgId/members')
  @ApiOperation({
    summary: '成员列表',
    description: '获取指定组织的成员列表（支持分页、关键字、部门、状态筛选）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '成员列表',
    type: OrgMemberListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async listMembers(
    @Param('orgId') orgId: string,
    @Query() pagination: PaginationDto,
  ): Promise<OrgMemberListResponse> {
    return this.orgMemberService.listMembers(orgId, pagination);
  }

  @Post('orgs/:orgId/members/batch')
  @ApiOperation({
    summary: '批量导入成员',
    description: '批量导入成员到组织',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '批量导入结果',
    type: BatchImportResponse,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async batchImportMembers(
    @Param('orgId') orgId: string,
    @Body() dto: BatchImportMemberDto,
  ): Promise<BatchImportResponse> {
    return this.orgMemberService.batchImportMembers(orgId, dto);
  }

  @Get('members/:memberId')
  @ApiOperation({
    summary: '成员详情',
    description: '根据成员 ID 获取成员详细信息',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '成员详情',
    type: OrgMemberDetailDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '成员不存在',
  })
  async getMember(
    @Param('memberId') memberId: string,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.getMember(memberId);
  }

  @Put('members/:memberId')
  @ApiOperation({
    summary: '更新成员信息',
    description: '更新成员信息（工号、岗位、上级、入职日期等）',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '成员更新成功',
    type: OrgMemberDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '成员不存在',
  })
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMember(memberId, dto);
  }

  @Patch('members/:memberId/status')
  @ApiOperation({
    summary: '更新成员状态',
    description: '启用/停用/离职成员',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: OrgMemberDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '成员不存在',
  })
  async updateMemberStatus(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberStatusDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMemberStatus(memberId, dto);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除成员',
    description: '删除/移除成员（软删除）',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '成员删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '成员不存在',
  })
  async deleteMember(@Param('memberId') memberId: string): Promise<void> {
    await this.orgMemberService.deleteMember(memberId);
  }

  @Patch('members/:memberId/departments')
  @ApiOperation({
    summary: '调整成员所属部门',
    description: '调整成员所属部门（主部门/兼职部门）',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门调整成功',
    type: OrgMemberDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '成员不存在',
  })
  async updateMemberDepartments(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDepartmentsDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMemberDepartments(memberId, dto);
  }
}
