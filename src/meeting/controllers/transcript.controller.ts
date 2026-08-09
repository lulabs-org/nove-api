import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from '@/permission/decorators/permissions.decorator';
import { TranscriptService } from '../services/transcript.service';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import { ApiGetTranscriptByRecordingIdDocs } from '../decorators/meeting-record.decorators';

@ApiTags('Meet Transcript')
@Controller('transcripts')
@ApiBearerAuth()
export class TranscriptController {
  private readonly logger = new Logger(TranscriptController.name);

  constructor(private readonly transcriptService: TranscriptService) {}

  /**
   * 获取录制的转写文本
   */
  @Get('recording/:recordingId')
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetTranscriptByRecordingIdDocs()
  async getTranscriptByRecordingId(
    @Param('recordingId', CuidPipe) recordingId: string,
    @Query('format') format?: 'text' | 'json',
  ): Promise<any> {
    this.logger.log(`获取录制的转写文本: ${recordingId}, format: ${format}`);

    try {
      if (format === 'json') {
        const data = await this.transcriptService.getJson(recordingId);

        this.logger.log(`获取录制的转写 JSON 成功: ${recordingId}`);
        return { data };
      }

      const text = await this.transcriptService.getText(recordingId);

      this.logger.log(`获取录制的转写文本成功: ${recordingId}`);
      return { text };
    } catch (error: unknown) {
      this.logger.error(
        `获取录制的转写文本失败: ${recordingId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * 获取转录列表
   */
  @Get()
  @RequirePermissions('meeting:read')
  @ApiOperation({ summary: '获取转录列表' })
  async getTranscripts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('recordingId') recordingId?: string,
  ) {
    return this.transcriptService.findMany(recordingId, Number(page), Number(limit));
  }

  /**
   * 获取转录记录详情
   */
  @Get(':id')
  @RequirePermissions('meeting:read')
  @ApiOperation({ summary: '获取转录记录详情' })
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
