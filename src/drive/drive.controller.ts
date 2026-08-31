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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import { AuthContext } from '@/auth/types/auth-context.interface';
import {
  CompleteUploadSessionDto,
  CreateDriveFolderDto,
  CreateUploadSessionDto,
  ListDriveNodesQueryDto,
  MoveDriveNodeDto,
  PutDriveGrantDto,
  SignUploadPartsDto,
  UpdateDriveNodeDto,
} from './dto';
import { DriveService } from './services/drive.service';
import { DriveCleanupService } from './services/drive-cleanup.service';

@ApiTags('Drive')
@ApiBearerAuth()
@Controller('drive')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly cleanupService: DriveCleanupService,
  ) {}

  @Get('spaces')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取当前用户可访问的云盘空间' })
  listSpaces(@Auth() auth: AuthContext) {
    return this.driveService.listSpaces(auth);
  }

  @Get('spaces/:spaceId/nodes')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '浏览空间目录' })
  listNodes(
    @Param('spaceId') spaceId: string,
    @Query() query: ListDriveNodesQueryDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.listNodes(spaceId, query, auth);
  }

  @Post('folders')
  @RequirePermissions('drive:upload')
  @ApiOperation({ summary: '创建文件夹' })
  createFolder(@Body() dto: CreateDriveFolderDto, @Auth() auth: AuthContext) {
    return this.driveService.createFolder(dto, auth);
  }

  @Patch('nodes/:nodeId')
  @RequirePermissions('drive:update')
  @ApiOperation({ summary: '更新文件或文件夹' })
  updateNode(
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateDriveNodeDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.updateNode(nodeId, dto, auth);
  }

  @Post('nodes/:nodeId/move')
  @RequirePermissions('drive:update')
  @ApiOperation({ summary: '移动文件或文件夹' })
  moveNode(
    @Param('nodeId') nodeId: string,
    @Body() dto: MoveDriveNodeDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.moveNode(nodeId, dto, auth);
  }

  @Post('upload-sessions')
  @RequirePermissions('drive:upload')
  @ApiOperation({ summary: '创建 OSS 分片上传会话' })
  createUploadSession(
    @Body() dto: CreateUploadSessionDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.createUploadSession(dto, auth);
  }

  @Post('upload-sessions/:id/parts')
  @RequirePermissions('drive:upload')
  @ApiOperation({ summary: '签发分片上传地址' })
  signUploadParts(
    @Param('id') id: string,
    @Body() dto: SignUploadPartsDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.signUploadParts(id, dto, auth);
  }

  @Post('upload-sessions/:id/complete')
  @RequirePermissions('drive:upload')
  @ApiOperation({ summary: '完成上传、校验格式并进入异步病毒扫描' })
  completeUploadSession(
    @Param('id') id: string,
    @Body() dto: CompleteUploadSessionDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.completeUploadSession(id, dto, auth);
  }

  @Delete('upload-sessions/:id')
  @RequirePermissions('drive:upload')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '中止上传会话' })
  abortUploadSession(@Param('id') id: string, @Auth() auth: AuthContext) {
    return this.driveService.abortUploadSession(id, auth);
  }

  @Get('files/:fileId')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取文件详情' })
  getFile(@Param('fileId') fileId: string, @Auth() auth: AuthContext) {
    return this.driveService.getFile(fileId, auth);
  }

  @Post('files/:fileId/download-url')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取十分钟有效的私有下载地址' })
  createDownloadUrl(
    @Param('fileId') fileId: string,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.createDownloadUrl(fileId, auth);
  }

  @Get('files/:fileId/bindings')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取文件业务关联' })
  listBindings(@Param('fileId') fileId: string, @Auth() auth: AuthContext) {
    return this.driveService.listBindings(fileId, auth);
  }

  @Get('nodes/:nodeId/grants')
  @RequirePermissions('drive:manage-acl')
  @ApiOperation({ summary: '获取节点授权' })
  listGrants(@Param('nodeId') nodeId: string, @Auth() auth: AuthContext) {
    return this.driveService.listGrants(nodeId, auth);
  }

  @Get('spaces/:spaceId/grants')
  @RequirePermissions('drive:manage-acl')
  @ApiOperation({ summary: '获取空间根授权' })
  listSpaceGrants(
    @Param('spaceId') spaceId: string,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.listSpaceGrants(spaceId, auth);
  }

  @Put('spaces/:spaceId/grants')
  @RequirePermissions('drive:manage-acl')
  @ApiOperation({ summary: '创建或更新空间根授权' })
  putSpaceGrant(
    @Param('spaceId') spaceId: string,
    @Body() dto: PutDriveGrantDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.putSpaceGrant(spaceId, dto, auth);
  }

  @Delete('spaces/:spaceId/grants/:grantId')
  @RequirePermissions('drive:manage-acl')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除空间根授权' })
  deleteSpaceGrant(
    @Param('spaceId') spaceId: string,
    @Param('grantId') grantId: string,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.deleteSpaceGrant(spaceId, grantId, auth);
  }

  @Get('nodes/:nodeId/audit')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取节点审计记录' })
  listAuditLogs(@Param('nodeId') nodeId: string, @Auth() auth: AuthContext) {
    return this.driveService.listAuditLogs(nodeId, auth);
  }

  @Put('nodes/:nodeId/grants')
  @RequirePermissions('drive:manage-acl')
  @ApiOperation({ summary: '创建或更新节点授权' })
  putGrant(
    @Param('nodeId') nodeId: string,
    @Body() dto: PutDriveGrantDto,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.putGrant(nodeId, dto, auth);
  }

  @Delete('nodes/:nodeId/grants/:grantId')
  @RequirePermissions('drive:manage-acl')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除节点授权' })
  deleteGrant(
    @Param('nodeId') nodeId: string,
    @Param('grantId') grantId: string,
    @Auth() auth: AuthContext,
  ) {
    return this.driveService.deleteGrant(nodeId, grantId, auth);
  }

  @Delete('nodes/:nodeId')
  @RequirePermissions('drive:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '移入回收站' })
  trashNode(@Param('nodeId') nodeId: string, @Auth() auth: AuthContext) {
    return this.driveService.trashNode(nodeId, auth);
  }

  @Post('nodes/:nodeId/restore')
  @RequirePermissions('drive:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '从回收站恢复' })
  restoreNode(@Param('nodeId') nodeId: string, @Auth() auth: AuthContext) {
    return this.driveService.restoreNode(nodeId, auth);
  }

  @Get('trash')
  @RequirePermissions('drive:read')
  @ApiOperation({ summary: '获取空间回收站' })
  listTrash(@Query('spaceId') spaceId: string, @Auth() auth: AuthContext) {
    return this.driveService.listTrash(spaceId, auth);
  }

  @Delete('trash/:nodeId/purge')
  @RequirePermissions('drive:admin')
  @ApiOperation({ summary: '立即永久清理回收站节点' })
  purgeTrashNode(@Param('nodeId') nodeId: string) {
    return this.cleanupService.purgeNode(nodeId);
  }
}
