import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  OrgMemberDetailDto,
  OrgMemberListResponse,
  MemberRoleOptionListResponse,
  BatchImportResponse,
} from '../dto';

export function ApiCreateMember() {
  return applyDecorators(
    ApiOperation({
      summary: '新增成员',
      description: '通过手机号或邮箱在指定组织下新增成员；已有用户直接关联，否则创建待验证用户',
    }),
    ApiParam({
      name: 'orgId',
      description: '组织 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 201, description: '成员创建成功', type: OrgMemberDetailDto }),
    ApiResponse({ status: 400, description: '请求参数无效' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 409, description: '联系方式冲突、成员已存在或工号已存在' }),
  );
}

export function ApiListMembers() {
  return applyDecorators(
    ApiOperation({
      summary: '成员列表',
      description: '获取指定组织的成员列表（支持分页、关键字、部门、状态筛选）',
    }),
    ApiParam({
      name: 'orgId',
      description: '组织 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '成员列表', type: OrgMemberListResponse }),
    ApiResponse({ status: 401, description: '未授权' }),
  );
}

export function ApiListMemberRoleOptions() {
  return applyDecorators(
    ApiOperation({
      summary: '角色成员选项',
      description: '分页获取角色管理所需的轻量成员与角色关联数据',
    }),
    ApiParam({ name: 'orgId', description: '组织 ID' }),
    ApiResponse({ status: 200, type: MemberRoleOptionListResponse }),
  );
}

export function ApiBatchImportMembers() {
  return applyDecorators(
    ApiOperation({
      summary: '批量导入成员',
      description: '批量导入成员到组织',
    }),
    ApiParam({
      name: 'orgId',
      description: '组织 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '批量导入结果', type: BatchImportResponse }),
    ApiResponse({ status: 400, description: '请求参数无效' }),
    ApiResponse({ status: 401, description: '未授权' }),
  );
}

export function ApiGetMember() {
  return applyDecorators(
    ApiOperation({
      summary: '成员详情',
      description: '根据成员 ID 获取成员详细信息',
    }),
    ApiParam({
      name: 'memberId',
      description: '成员 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '成员详情', type: OrgMemberDetailDto }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 404, description: '成员不存在' }),
  );
}

export function ApiUpdateMember() {
  return applyDecorators(
    ApiOperation({
      summary: '更新成员信息',
      description: '更新成员信息（工号、岗位、上级、入职日期等）',
    }),
    ApiParam({
      name: 'memberId',
      description: '成员 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '成员更新成功', type: OrgMemberDetailDto }),
    ApiResponse({ status: 400, description: '请求参数无效' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 404, description: '成员不存在' }),
  );
}

export function ApiUpdateMemberStatus() {
  return applyDecorators(
    ApiOperation({
      summary: '更新成员状态',
      description: '启用/停用/离职成员',
    }),
    ApiParam({
      name: 'memberId',
      description: '成员 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '状态更新成功', type: OrgMemberDetailDto }),
    ApiResponse({ status: 400, description: '请求参数无效' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 404, description: '成员不存在' }),
  );
}

export function ApiDeleteMember() {
  return applyDecorators(
    ApiOperation({
      summary: '删除成员',
      description: '删除/移除成员（软删除）',
    }),
    ApiParam({
      name: 'memberId',
      description: '成员 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 204, description: '成员删除成功' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 404, description: '成员不存在' }),
  );
}

export function ApiUpdateMemberDepartments() {
  return applyDecorators(
    ApiOperation({
      summary: '调整成员所属部门',
      description: '调整成员所属部门（主部门/兼职部门）',
    }),
    ApiParam({
      name: 'memberId',
      description: '成员 ID',
      example: 'clx1234567890abcdef',
    }),
    ApiResponse({ status: 200, description: '部门调整成功', type: OrgMemberDetailDto }),
    ApiResponse({ status: 400, description: '请求参数无效' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 404, description: '成员不存在' }),
  );
}
