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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { DepartmentService } from '../services/department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  PaginationDto,
  DepartmentDto,
  DepartmentListResponse,
  DepartmentTreeDto,
  MoveDepartmentDto,
  UpdateStatusDto,
  DepartmentMembersResponse,
  DepartmentAncestorsResponse,
} from '../dto';

@ApiTags('Admin - Departments')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post('orgs/:orgId/departments')
  @ApiOperation({
    summary: '新增部门',
    description: '在指定组织下新增部门',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 201,
    description: '部门创建成功',
    type: DepartmentDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async createDepartment(
    @Param('orgId') orgId: string,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.createDepartment(orgId, dto);
  }

  @Get('orgs/:orgId/departments/tree')
  @ApiOperation({
    summary: '获取部门树',
    description: '获取指定组织的完整部门树结构',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门树',
    type: [DepartmentTreeDto],
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async getDepartmentTree(
    @Param('orgId') orgId: string,
  ): Promise<DepartmentTreeDto[]> {
    return this.departmentService.getDepartmentTree(orgId);
  }

  @Get('orgs/:orgId/departments')
  @ApiOperation({
    summary: '部门列表',
    description: '获取指定组织的部门列表（支持按父部门、层级筛选和分页）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门列表',
    type: DepartmentListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async listDepartments(
    @Param('orgId') orgId: string,
    @Query() pagination: PaginationDto,
  ): Promise<DepartmentListResponse> {
    return this.departmentService.listDepartments(orgId, pagination);
  }

  @Get('departments/:deptId')
  @ApiOperation({
    summary: '部门详情',
    description: '根据部门 ID 获取部门详细信息',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门详情',
    type: DepartmentDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在',
  })
  async getDepartment(@Param('deptId') deptId: string): Promise<DepartmentDto> {
    return this.departmentService.getDepartment(deptId);
  }

  @Put('departments/:deptId')
  @ApiOperation({
    summary: '更新部门',
    description: '更新部门信息（名称、负责人、排序、描述等）',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门更新成功',
    type: DepartmentDto,
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
    description: '部门不存在',
  })
  async updateDepartment(
    @Param('deptId') deptId: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.updateDepartment(deptId, dto);
  }

  @Patch('departments/:deptId/move')
  @ApiOperation({
    summary: '移动部门',
    description: '移动部门到新的父部门或调整同级排序',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '部门移动成功',
    type: DepartmentDto,
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
    description: '部门不存在',
  })
  async moveDepartment(
    @Param('deptId') deptId: string,
    @Body() dto: MoveDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.moveDepartment(deptId, dto);
  }

  @Patch('departments/:deptId/status')
  @ApiOperation({
    summary: '启用/停用部门',
    description: '更新部门的启用状态',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: DepartmentDto,
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
    description: '部门不存在',
  })
  async updateStatus(
    @Param('deptId') deptId: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.updateStatus(deptId, dto.active);
  }

  @Delete('departments/:deptId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除部门',
    description: '删除部门（软删除，需校验是否有子部门/成员）',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '部门删除成功',
  })
  @ApiResponse({
    status: 400,
    description: '无法删除：存在子部门或成员',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在',
  })
  async deleteDepartment(@Param('deptId') deptId: string): Promise<void> {
    await this.departmentService.deleteDepartment(deptId);
  }

  @Get('departments/:deptId/members')
  @ApiOperation({
    summary: '部门成员列表',
    description: '获取部门成员列表（可选择是否包含子部门成员）',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiQuery({
    name: 'includeChildren',
    description: '是否包含子部门成员',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'page',
    description: '页码',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数量',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '部门成员列表',
    type: DepartmentMembersResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在',
  })
  async getDepartmentMembers(
    @Param('deptId') deptId: string,
    @Query('includeChildren') includeChildren: boolean = false,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ): Promise<DepartmentMembersResponse> {
    return this.departmentService.getDepartmentMembers(
      deptId,
      includeChildren,
      page,
      pageSize,
    );
  }

  @Get('departments/:deptId/ancestors')
  @ApiOperation({
    summary: '祖先链',
    description: '获取部门的祖先链（面包屑导航）',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '祖先链',
    type: DepartmentAncestorsResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在',
  })
  async getDepartmentAncestors(
    @Param('deptId') deptId: string,
  ): Promise<DepartmentAncestorsResponse> {
    return this.departmentService.getDepartmentAncestors(deptId);
  }

  @Get('departments/:deptId/children')
  @ApiOperation({
    summary: '直接子部门',
    description: '获取部门的直接子部门列表',
  })
  @ApiParam({
    name: 'deptId',
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '子部门列表',
    type: [DepartmentDto],
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '部门不存在',
  })
  async getDepartmentChildren(
    @Param('deptId') deptId: string,
  ): Promise<DepartmentDto[]> {
    return this.departmentService.getDepartmentChildren(deptId);
  }
}
