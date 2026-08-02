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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/permission/decorators/permissions.decorator';
import { Public } from '@/auth/decorators/public.decorator';

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
  AddMemberDto,
  AddMemberResponseDto,
} from '../dto';

@ApiTags('Admin - OrgMembers')
@Controller('admin')
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
  @RequirePermissions('org-member:create')
  async createMember(
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.createMember(orgId, dto);
  }

  @Post('orgs/:orgId/members/add')
  @ApiOperation({
    summary: '添加成员',
    description:
      '通过姓名、手机号、邮箱等基础信息添加成员。系统自动完成用户创建、邀请令牌生成、邮件发送和组织关联。',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 201,
    description: '成员添加成功',
    type: AddMemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效（必填字段缺失、邮箱格式错误、主部门不合法等）',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @RequirePermissions('org-member:create')
  async addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
  ): Promise<AddMemberResponseDto> {
    return this.orgMemberService.addMember(orgId, dto);
  }

  @Post('members/:memberId/accept')
  @Public()
  @ApiOperation({
    summary: '接受组织邀请',
    description:
      '成员通过邮件中的邀请链接接受邀请，将成员状态从 PENDING 转为 AGREED，并标记用户邮箱已验证。',
  })
  @ApiParam({
    name: 'memberId',
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiBody({
    description: '邀请令牌',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: '邀请令牌（来自邮件链接）' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: '邀请已接受' })
  @ApiResponse({ status: 400, description: '邀请令牌无效或已过期' })
  @ApiResponse({ status: 404, description: '成员不存在' })
  async acceptInvitation(
    @Param('memberId') memberId: string,
    @Body('token') token: string,
  ): Promise<void> {
    await this.orgMemberService.acceptInvitation(memberId, token);
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
  @RequirePermissions('org-member:read')
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
  @RequirePermissions('org-member:create')
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
  @RequirePermissions('org-member:read')
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
  @RequirePermissions('org-member:update')
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
  @RequirePermissions('org-member:update')
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
  @RequirePermissions('org-member:delete')
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
  @RequirePermissions('org-member:update')
  async updateMemberDepartments(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDepartmentsDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMemberDepartments(memberId, dto);
  }
}
