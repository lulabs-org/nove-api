import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  CreateProjectDto,
  ProjectDto,
  ProjectListResponseDto,
  QueryProjectDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
} from '../dto';
import { ProjectService } from '../services/project.service';

@ApiTags('Admin - Projects')
@ApiBearerAuth()
@Controller('admin/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermissions('project:create')
  @ApiOperation({ summary: '创建项目' })
  @ApiResponse({ status: 201, type: ProjectDto })
  create(
    @Body() dto: CreateProjectDto,
    @Auth('orgId') orgId?: string | null,
    @Auth('userId') userId?: string | null,
  ): Promise<ProjectDto> {
    return this.projectService.create(
      this.projectService.requireOrgId(orgId),
      dto,
      userId,
    );
  }

  @Get()
  @RequirePermissions('project:read')
  @ApiOperation({ summary: '获取当前组织的项目列表' })
  @ApiResponse({ status: 200, type: ProjectListResponseDto })
  findAll(
    @Query() query: QueryProjectDto,
    @Auth('orgId') orgId?: string | null,
  ): Promise<ProjectListResponseDto> {
    return this.projectService.findAll(
      this.projectService.requireOrgId(orgId),
      query,
    );
  }

  @Get(':id')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: '获取项目详情' })
  @ApiParam({ name: 'id', description: '项目 ID' })
  @ApiResponse({ status: 200, type: ProjectDto })
  findById(
    @Param('id') id: string,
    @Auth('orgId') orgId?: string | null,
  ): Promise<ProjectDto> {
    return this.projectService.findById(
      id,
      this.projectService.requireOrgId(orgId),
    );
  }

  @Put(':id')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: '更新项目' })
  @ApiResponse({ status: 200, type: ProjectDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Auth('orgId') orgId?: string | null,
    @Auth('userId') userId?: string | null,
  ): Promise<ProjectDto> {
    return this.projectService.update(
      id,
      this.projectService.requireOrgId(orgId),
      dto,
      userId,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('project:toggle-status')
  @ApiOperation({ summary: '更新项目状态' })
  @ApiResponse({ status: 200, type: ProjectDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
    @Auth('orgId') orgId?: string | null,
    @Auth('userId') userId?: string | null,
  ): Promise<ProjectDto> {
    return this.projectService.updateStatus(
      id,
      this.projectService.requireOrgId(orgId),
      dto.status,
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions('project:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '软删除项目' })
  @ApiResponse({ status: 204, description: '项目已删除' })
  async delete(
    @Param('id') id: string,
    @Auth('orgId') orgId?: string | null,
    @Auth('userId') userId?: string | null,
  ): Promise<void> {
    await this.projectService.delete(
      id,
      this.projectService.requireOrgId(orgId),
      userId,
    );
  }
}
