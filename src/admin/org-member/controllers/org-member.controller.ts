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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';

import { OrgMemberService } from '../services/org-member.service';
import {
  CreateOrgMemberDto,
  UpdateOrgMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberDepartmentsDto,
  BatchImportMemberDto,
  QueryOrgMemberDto,
  OrgMemberDetailDto,
  OrgMemberListResponse,
  QueryMemberRoleOptionDto,
  MemberRoleOptionListResponse,
  BatchImportResponse,
} from '../dto';
import {
  ApiCreateMember,
  ApiListMembers,
  ApiListMemberRoleOptions,
  ApiBatchImportMembers,
  ApiGetMember,
  ApiUpdateMember,
  ApiUpdateMemberStatus,
  ApiDeleteMember,
  ApiUpdateMemberDepartments,
} from '../decorators/org-member.decorators';

@ApiTags('Admin / OrgMembers')
@Controller('admin')
@ApiBearerAuth()
export class OrgMemberController {
  constructor(private readonly orgMemberService: OrgMemberService) {}

  @Post('orgs/:orgId/members')
  @ApiCreateMember()
  @RequirePermissions('org-member:create')
  async createMember(
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.createMember(orgId, dto);
  }

  @Get('orgs/:orgId/members')
  @ApiListMembers()
  @RequirePermissions('org-member:read')
  async listMembers(
    @Param('orgId') orgId: string,
    @Query() pagination: QueryOrgMemberDto,
  ): Promise<OrgMemberListResponse> {
    return this.orgMemberService.listMembers(orgId, pagination);
  }

  @Get('orgs/:orgId/member-role-options')
  @ApiListMemberRoleOptions()
  @RequirePermissions('org-member:read')
  async listMemberRoleOptions(
    @Param('orgId') orgId: string,
    @Query() query: QueryMemberRoleOptionDto,
  ): Promise<MemberRoleOptionListResponse> {
    return this.orgMemberService.listMemberRoleOptions(orgId, query);
  }

  @Post('orgs/:orgId/members/batch')
  @ApiBatchImportMembers()
  @RequirePermissions('org-member:create')
  async batchImportMembers(
    @Param('orgId') orgId: string,
    @Body() dto: BatchImportMemberDto,
  ): Promise<BatchImportResponse> {
    return this.orgMemberService.batchImportMembers(orgId, dto);
  }

  @Get('members/:memberId')
  @ApiGetMember()
  @RequirePermissions('org-member:read')
  async getMember(
    @Param('memberId') memberId: string,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.getMember(memberId);
  }

  @Put('members/:memberId')
  @ApiUpdateMember()
  @RequirePermissions('org-member:update')
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMember(memberId, dto);
  }

  @Patch('members/:memberId/status')
  @ApiUpdateMemberStatus()
  @RequirePermissions('org-member:update')
  async updateMemberStatus(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberStatusDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMemberStatus(memberId, dto);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteMember()
  @RequirePermissions('org-member:delete')
  async deleteMember(@Param('memberId') memberId: string): Promise<void> {
    await this.orgMemberService.deleteMember(memberId);
  }

  @Patch('members/:memberId/departments')
  @ApiUpdateMemberDepartments()
  @RequirePermissions('org-member:update')
  async updateMemberDepartments(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDepartmentsDto,
  ): Promise<OrgMemberDetailDto> {
    return this.orgMemberService.updateMemberDepartments(memberId, dto);
  }
}
