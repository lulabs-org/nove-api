import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiGetMeetingRecordsDocs,
  ApiGetMeetingRecordByIdDocs,
  ApiCreateMeetingRecordDocs,
  ApiUpdateMeetingRecordDocs,
  ApiDeleteMeetingRecordDocs,
  ApiGetMeetingStatsDocs,
  ApiReprocessMeetingRecordDocs,
  ApiHealthCheckDocs,
} from './decorators/meeting-record.decorators';
import { MeetingService } from './meeting.service';
import {
  QueryMeetingRecordsDto,
  MeetingRecordResponseDto,
  MeetingRecordListResponseDto,
  MeetingStatsResponseDto,
  DeleteMeetingRecordResponseDto,
  CreateMeetingRecordDto,
  UpdateMeetingRecordDto,
} from './dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

/**
 * 会议记录控制器
 * 提供会议记录的CRUD操作API
 */
@ApiTags('Meet')
@Controller('meetings')
@ApiBearerAuth()
export class MeetingController {
  private readonly logger = new Logger(MeetingController.name);

  constructor(private readonly meetingService: MeetingService) {}

  /**
   * 获取会议记录列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingRecordsDocs()
  async getMeetingRecords(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMeetingRecordsDto,
  ): Promise<MeetingRecordListResponseDto> {
    this.logger.log('获取会议记录列表', { query });

    try {
      const queryParams = {
        ...query,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };
      const result = await this.meetingService.getMeetingRecords(queryParams);

      this.logger.log(`获取会议记录成功，共 ${result.total} 条记录`);
      return {
        data: result.records,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      };
    } catch (error: unknown) {
      this.logger.error('获取会议记录失败', (error as Error).stack);
      throw error;
    }
  }

  /**
   * 健康检查端点
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiHealthCheckDocs()
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'meeting-service',
    };
  }

  /**
   * 根据ID获取会议记录详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingRecordByIdDocs()
  async getMeetingRecordById(
    @Param('id', CuidPipe) id: string,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log(`获取会议记录详情: ${id}`);

    try {
      const record = await this.meetingService.getMeetingRecordById(id);

      this.logger.log(`获取会议记录详情成功: ${record.id}`);
      return record;
    } catch (error: unknown) {
      this.logger.error(`获取会议记录详情失败: ${id}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * 创建会议记录
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateMeetingRecordDocs()
  async createMeetingRecord(
    @Body(new ValidationPipe()) createParams: CreateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log('创建会议记录', {
      meetingId: createParams.platformMeetingId,
    });

    try {
      const record =
        await this.meetingService.createMeetingRecord(createParams);

      this.logger.log(`创建会议记录成功: ${record.id}`);
      return record;
    } catch (error: unknown) {
      this.logger.error('创建会议记录失败', (error as Error).stack);
      throw error;
    }
  }

  /**
   * 更新会议记录
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateMeetingRecordDocs()
  async updateMeetingRecord(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log(`更新会议记录: ${id}`, updateParams);

    try {
      const record = await this.meetingService.updateMeetingRecord(
        id,
        updateParams,
      );

      this.logger.log(`更新会议记录成功: ${record.id}`);
      return record;
    } catch (error: unknown) {
      this.logger.error(`更新会议记录失败: ${id}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * 删除会议记录
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteMeetingRecordDocs()
  async deleteMeetingRecord(
    @Param('id', CuidPipe) id: string,
  ): Promise<DeleteMeetingRecordResponseDto> {
    this.logger.log(`删除会议记录: ${id}`);

    try {
      const record = await this.meetingService.deleteMeetingRecord(id);

      this.logger.log(`删除会议记录成功: ${record.id}`);

      return {
        success: true,
        data: record,
        deletedAt: new Date(),
      };
    } catch (error: unknown) {
      this.logger.error(`删除会议记录失败: ${id}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * 获取会议统计信息
   */
  @Get('stats/summary')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingStatsDocs()
  getMeetingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): MeetingStatsResponseDto {
    this.logger.log('获取会议统计信息', { startDate, endDate });

    try {
      const stats = this.meetingService.getMeetingStats({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      this.logger.log('获取会议统计信息成功');
      return stats;
    } catch (error: unknown) {
      this.logger.error('获取会议统计信息失败', (error as Error).stack);
      throw error;
    }
  }

  /**
   * 重新处理会议录制文件
   */
  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  @ApiReprocessMeetingRecordDocs()
  async reprocessMeetingRecord(
    @Param('id', CuidPipe) id: string,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log(`重新处理会议录制文件: ${id}`);

    try {
      const record = await this.meetingService.reprocessMeetingRecord(id);

      this.logger.log(`重新处理会议录制文件成功: ${record.id}`);
      return record;
    } catch (error: unknown) {
      this.logger.error(
        `重新处理会议录制文件失败: ${id}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
