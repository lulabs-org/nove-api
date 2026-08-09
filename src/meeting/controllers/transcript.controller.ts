import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Delete,
  Post,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/permission/decorators/permissions.decorator';
import { TranscriptService } from '../services/transcript.service';
import {
  CreateTranscriptDto,
  TranscriptDto,
  TranscriptListResponseDto,
} from '../dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

@ApiTags('Meet Transcript')
@Controller('transcripts')
@ApiBearerAuth()
export class TranscriptController {
  private readonly logger = new Logger(TranscriptController.name);

  constructor(private readonly transcriptService: TranscriptService) {}

  /**
   * 创建转录记录
   */
  @Post()
  @RequirePermissions('meeting:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建转录记录' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TranscriptDto })
  async createTranscript(
    @Body(new ValidationPipe()) createParams: CreateTranscriptDto,
  ) {
    this.logger.log(`创建转录记录: ${createParams.recordingId}`);
    return this.transcriptService.create(createParams);
  }

  /**
   * 获取转录列表
   */
  @Get()
  @RequirePermissions('meeting:read')
  @ApiOperation({ summary: '获取转录列表' })
  @ApiResponse({ status: HttpStatus.OK, type: TranscriptListResponseDto })
  async getTranscripts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('recordingId') recordingId?: string,
  ) {
    return this.transcriptService.findMany(
      recordingId,
      Number(page),
      Number(limit),
    );
  }

  /**
   * 获取转录记录详情
   */
  @Get(':id')
  @RequirePermissions('meeting:read')
  @ApiOperation({ summary: '获取转录记录详情' })
  @ApiResponse({ status: HttpStatus.OK, type: TranscriptDto })
  async getTranscriptById(@Param('id', CuidPipe) id: string) {
    return this.transcriptService.findById(id);
  }

  /**
   * 删除转录记录
   */
  @Delete(':id')
  @RequirePermissions('meeting:delete')
  @ApiOperation({ summary: '删除转录记录' })
  async deleteTranscript(@Param('id', CuidPipe) id: string) {
    return this.transcriptService.delete(id);
  }
}
