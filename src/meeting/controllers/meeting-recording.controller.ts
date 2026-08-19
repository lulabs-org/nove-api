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
import { MeetingRecordingService } from '../services/meeting-recording.service';
import { TranscriptService } from '../services/transcript.service';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import { ApiGetTranscriptByRecordingIdDocs } from '../decorators/meeting-record.decorators';
import {
  CreateMeetingRecordingDto,
  UpdateMeetingRecordingDto,
  QueryMeetingRecordingDto,
  MeetingRecordingListResponseDto,
  MeetingRecordingDto,
  MeetingRecordingDeleteResponseDto,
  CreateRecordingSummaryDto,
} from '../dto/meeting-recording.dto';
import { MeetingSummaryDto } from '../dto/meeting-summary.dto';

@ApiTags('Meet Recording')
@Controller('recordings')
@ApiBearerAuth()
export class MeetingRecordingController {
  private readonly logger = new Logger(MeetingRecordingController.name);

  constructor(
    private readonly recordingService: MeetingRecordingService,
    private readonly transcriptService: TranscriptService,
  ) {}

  /**
   * 创建录制
   */
  @Post()
  @RequirePermissions('meeting-recording:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建录制记录' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: MeetingRecordingDto,
  })
  async createRecording(
    @Body(new ValidationPipe()) createParams: CreateMeetingRecordingDto,
  ) {
    this.logger.log(`创建录制记录: ${createParams.meetingId}`);
    return this.recordingService.create(createParams);
  }

  /**
   * 获取录制列表
   */
  @Get()
  @RequirePermissions('meeting-recording:read')
  @ApiOperation({ summary: '获取录制列表' })
  @ApiResponse({ status: 200, type: MeetingRecordingListResponseDto })
  async getRecordings(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMeetingRecordingDto,
  ) {
    return this.recordingService.findMany(query);
  }

  /**
   * 获取录制详情
   */
  @Get(':id')
  @RequirePermissions('meeting-recording:read')
  @ApiOperation({ summary: '获取录制详情' })
  @ApiParam({ name: 'id', description: '录制记录ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: MeetingRecordingDto,
  })
  async getRecordingById(@Param('id', CuidPipe) id: string) {
    return this.recordingService.getById(id);
  }

  /**
   * 获取录制转写
   */
  @Get(':id/transcript')
  @RequirePermissions('meeting-recording:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetTranscriptByRecordingIdDocs()
  async getTranscript(
    @Param('id', CuidPipe) recordingId: string,
    @Query('format') format?: 'text' | 'json',
  ): Promise<any> {
    this.logger.log(`获取转写文本: ${recordingId}, format: ${format}`);

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
   * 获取录制总结
   */
  @Get(':id/summary')
  @RequirePermissions('meeting-recording:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取录制总结' })
  @ApiParam({ name: 'id', description: '录制记录ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: MeetingSummaryDto,
  })
  async getRecordingSummary(@Param('id', CuidPipe) id: string) {
    return this.recordingService.getSummary(id);
  }

  /**
   * 写入外部 AI 生成的录制总结
   */
  @Post(':id/summary')
  @RequirePermissions('meeting-recording:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '写入外部 AI 生成的录制总结' })
  @ApiParam({ name: 'id', description: '录制记录ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    type: MeetingSummaryDto,
  })
  async createRecordingSummary(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) createParams: CreateRecordingSummaryDto,
  ) {
    return this.recordingService.createSummary(id, createParams);
  }

  /**
   * 更新录制记录
   */
  @Patch(':id')
  @RequirePermissions('meeting-recording:update')
  @ApiOperation({ summary: '更新录制记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: MeetingRecordingDto,
  })
  async updateRecording(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMeetingRecordingDto,
  ) {
    return this.recordingService.update(id, updateParams);
  }

  /**
   * 删除录制记录
   */
  @Delete(':id')
  @RequirePermissions('meeting-recording:delete')
  @ApiOperation({ summary: '删除录制记录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '删除成功',
    type: MeetingRecordingDeleteResponseDto,
  })
  async deleteRecording(@Param('id', CuidPipe) id: string) {
    return this.recordingService.delete(id);
  }
}
