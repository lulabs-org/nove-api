import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Body,
  Patch,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  RequireAllPermissions,
  RequirePermissions,
} from '@/admin/permission/decorators/permissions.decorator';
import { MinuteService } from '../services/minute.service';
import { TranscriptService } from '../services/transcript.service';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import {
  ApiGetTranscriptDocs,
  ApiGetTranscriptTextDocs,
} from '../decorators/minute.decorators';
import {
  CreateTranscriptBodyDto,
  QueryTranscriptDto,
  TranscriptDto,
  TranscriptJsonResponseDto,
  TranscriptTextResponseDto,
} from '../dto/transcript.dto';
import {
  CreateMinuteDto,
  UpdateMinuteDto,
  QueryMinuteDto,
  MinuteListResponseDto,
  MinuteDto,
  MinuteDeleteResponseDto,
} from '../dto/minute.dto';
import { Auth } from '@/auth/decorators/auth.decorator';
import { AuthContext } from '@/auth/types/auth-context.interface';
import { MinuteFileDriveService } from '../services/minute-file-drive.service';
import { AttachMinuteFileDto } from '../dto/minute-file.dto';

@ApiTags('Minute')
@Controller('minutes')
@ApiBearerAuth()
export class MinuteController {
  private readonly logger = new Logger(MinuteController.name);

  constructor(
    private readonly minuteService: MinuteService,
    private readonly transcriptService: TranscriptService,
    private readonly minuteFileDriveService: MinuteFileDriveService,
  ) {}

  @Get(':id/files')
  @RequireAllPermissions('minute:read', 'drive:read')
  @ApiOperation({ summary: '获取 Minute 的云盘文件' })
  listMinuteFiles(
    @Param('id', CuidPipe) id: string,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteFileDriveService.list(id, this.organizationScope(auth));
  }

  @Post(':id/files')
  @RequireAllPermissions('minute:update', 'drive:read', 'drive:update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '将组织云盘文件关联到 Minute' })
  attachMinuteFile(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) dto: AttachMinuteFileDto,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteFileDriveService.attach(
      id,
      dto,
      auth,
      this.minuteService.requireOrgId(auth.orgId),
    );
  }

  /**
   * 创建录制记录
   */
  @Post()
  @RequirePermissions('minute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建录制记录' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: MinuteDto,
  })
  async createMinute(
    @Body(new ValidationPipe()) createParams: CreateMinuteDto,
    @Auth() auth: AuthContext,
  ) {
    this.logger.log(`创建录制记录: ${createParams.meetingId}`);
    return this.minuteService.create(
      createParams,
      this.minuteService.requireOrgId(auth.orgId),
    );
  }

  /**
   * 获取录制列表
   */
  @Get()
  @RequirePermissions('minute:read')
  @ApiOperation({ summary: '获取录制列表' })
  @ApiResponse({ status: 200, type: MinuteListResponseDto })
  async getMinutes(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMinuteDto,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteService.findMany(query, this.organizationScope(auth));
  }

  /**
   * 获取录制详情
   */
  @Get(':id')
  @RequirePermissions('minute:read')
  @ApiOperation({ summary: '获取录制详情' })
  @ApiParam({ name: 'id', description: '录制记录ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: MinuteDto,
  })
  async getMinuteById(
    @Param('id', CuidPipe) id: string,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteService.getById(id, this.organizationScope(auth));
  }

  /**
   * 创建录制转写
   */
  @Post(':id/transcript')
  @RequirePermissions('minute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建录制转写记录' })
  @ApiParam({ name: 'id', description: '录制记录ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: TranscriptDto,
  })
  async createTranscript(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) createParams: CreateTranscriptBodyDto,
    @Auth() auth: AuthContext,
  ) {
    this.logger.log(`创建录制转写记录: ${id}`);
    await this.minuteService.getById(id, this.organizationScope(auth));
    return this.transcriptService.create({
      ...createParams,
      minuteId: id,
    });
  }

  /**
   * 获取结构化录制转写
   */
  @Get(':id/transcript')
  @RequirePermissions('minute:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetTranscriptDocs()
  async getTranscript(
    @Param('id', CuidPipe) minuteId: string,
    @Query(new ValidationPipe({ transform: true })) query: QueryTranscriptDto,
    @Auth() auth: AuthContext,
  ): Promise<TranscriptJsonResponseDto> {
    const { includeLocalUser = false } = query;
    this.logger.log(
      `获取结构化转写: ${minuteId}, includeLocalUser: ${includeLocalUser}`,
    );

    try {
      await this.minuteService.getById(minuteId, this.organizationScope(auth));
      const result = await this.transcriptService.getJson(
        minuteId,
        includeLocalUser,
      );

      this.logger.log(`获取结构化录制转写成功: ${minuteId}`);
      return result;
    } catch (error: unknown) {
      this.logger.error(
        `获取结构化录制转写失败: ${minuteId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * 获取录制转写文本
   */
  @Get(':id/transcript/text')
  @RequirePermissions('minute:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetTranscriptTextDocs()
  async getTranscriptText(
    @Param('id', CuidPipe) minuteId: string,
    @Auth() auth: AuthContext,
  ): Promise<TranscriptTextResponseDto> {
    this.logger.log(`获取录制转写文本: ${minuteId}`);

    try {
      await this.minuteService.getById(minuteId, this.organizationScope(auth));
      const text = await this.transcriptService.getText(minuteId);

      this.logger.log(`获取录制的转写文本成功: ${minuteId}`);
      return { text };
    } catch (error: unknown) {
      this.logger.error(
        `获取录制的转写文本失败: ${minuteId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * 更新录制记录
   */
  @Patch(':id')
  @RequirePermissions('minute:update')
  @ApiOperation({ summary: '更新录制记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: MinuteDto,
  })
  async updateMinute(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMinuteDto,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteService.update(
      id,
      updateParams,
      this.organizationScope(auth),
    );
  }

  /**
   * 删除录制记录
   */
  @Delete(':id')
  @RequirePermissions('minute:delete')
  @ApiOperation({ summary: '删除录制记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '删除成功',
    type: MinuteDeleteResponseDto,
  })
  async deleteMinute(
    @Param('id', CuidPipe) id: string,
    @Auth() auth: AuthContext,
  ) {
    return this.minuteService.delete(id, this.organizationScope(auth));
  }

  private organizationScope(auth: AuthContext): string | undefined {
    return auth.permissions.includes('drive:admin')
      ? undefined
      : this.minuteService.requireOrgId(auth.orgId);
  }
}
