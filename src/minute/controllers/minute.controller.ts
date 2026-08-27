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
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
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

@ApiTags('Minute')
@Controller('minutes')
@ApiBearerAuth()
export class MinuteController {
  private readonly logger = new Logger(MinuteController.name);

  constructor(
    private readonly minuteService: MinuteService,
    private readonly transcriptService: TranscriptService,
  ) {}

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
  ) {
    this.logger.log(`创建录制记录: ${createParams.meetingId}`);
    return this.minuteService.create(createParams);
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
  ) {
    return this.minuteService.findMany(query);
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
  async getMinuteById(@Param('id', CuidPipe) id: string) {
    return this.minuteService.getById(id);
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
  ) {
    this.logger.log(`创建录制转写记录: ${id}`);
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
  ): Promise<TranscriptJsonResponseDto> {
    const { includeLocalUser = false } = query;
    this.logger.log(
      `获取结构化转写: ${minuteId}, includeLocalUser: ${includeLocalUser}`,
    );

    try {
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
  ): Promise<TranscriptTextResponseDto> {
    this.logger.log(`获取录制转写文本: ${minuteId}`);

    try {
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
  ) {
    return this.minuteService.update(id, updateParams);
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
  async deleteMinute(@Param('id', CuidPipe) id: string) {
    return this.minuteService.delete(id);
  }
}
