import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import {
  ApiGetMeetingRecordsDocs,
  ApiGetMeetingRecordByIdDocs,
  ApiCreateMeetingRecordDocs,
  ApiUpdateMeetingRecordDocs,
  ApiDeleteMeetingRecordDocs,
  ApiGetMeetingStatsDocs,
} from '../decorators/meeting.decorators';
import { MeetingService } from '../services/meeting.service';
import {
  QueryMeetingRecordsDto,
  MeetingRecordResponseDto,
  MeetingRecordListResponseDto,
  MeetingStatsResponseDto,
  DeleteMeetingRecordResponseDto,
  CreateMeetingRecordDto,
  UpdateMeetingRecordDto,
  QueryMeetingStatsDto,
  QueryMeetingParticipantsDto,
  MeetingParticipantListResponseDto,
} from '../dto';
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
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingRecordsDocs()
  async getMeetingRecords(
    @Query() query: QueryMeetingRecordsDto,
  ): Promise<MeetingRecordListResponseDto> {
    this.logger.log('获取会议记录列表', { query });
    const result = await this.meetingService.findMany(query);

    this.logger.log(`获取会议记录成功，共 ${result.total} 条记录`);
    return {
      data: result.records,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * 根据ID获取会议记录详情
   */
  @Get(':id')
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingRecordByIdDocs()
  async getMeetingRecordById(
    @Param('id', CuidPipe) id: string,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log(`获取会议记录详情: ${id}`);

    const record = await this.meetingService.findById(id);

    this.logger.log(`获取会议记录详情成功: ${record.id}`);
    return record;
  }

  /**
   * 获取会议参会成员列表
   */
  @Get(':id/participants')
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取会议参会成员列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MeetingParticipantListResponseDto,
  })
  async getMeetingParticipants(
    @Param('id', CuidPipe) id: string,
    @Query() query: QueryMeetingParticipantsDto,
  ): Promise<MeetingParticipantListResponseDto> {
    return this.meetingService.findParticipants(id, query);
  }

  /**
   * 创建会议记录
   */
  @Post()
  @RequirePermissions('meeting:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateMeetingRecordDocs()
  async createMeetingRecord(
    @Body() createParams: CreateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log('创建会议记录', {
      meetingId: createParams.platformMeetingId,
    });

    const record = await this.meetingService.create(createParams);

    this.logger.log(`创建会议记录成功: ${record.id}`);
    return record;
  }

  /**
   * 更新会议记录
   */
  @Patch(':id')
  @RequirePermissions('meeting:update')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateMeetingRecordDocs()
  async updateMeetingRecord(
    @Param('id', CuidPipe) id: string,
    @Body() updateParams: UpdateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    this.logger.log(`更新会议记录: ${id}`);
    const record = await this.meetingService.update(id, updateParams);

    this.logger.log(`更新会议记录成功: ${record.id}`);
    return record;
  }

  /**
   * 删除会议记录
   */
  @Delete(':id')
  @RequirePermissions('meeting:delete')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteMeetingRecordDocs()
  async deleteMeetingRecord(
    @Param('id', CuidPipe) id: string,
  ): Promise<DeleteMeetingRecordResponseDto> {
    this.logger.log(`删除会议记录: ${id}`);

    const record = await this.meetingService.delete(id);

    this.logger.log(`删除会议记录成功: ${record.id}`);

    return {
      success: true,
      data: record,
      deletedAt: record.deletedAt,
    };
  }

  /**
   * 获取会议统计信息
   */
  @Get('stats/summary')
  @RequirePermissions('meeting:stats_view')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeetingStatsDocs()
  async getMeetingStats(
    @Query() query: QueryMeetingStatsDto,
  ): Promise<MeetingStatsResponseDto> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('startDate 必须早于 endDate');
    }

    this.logger.log('获取会议统计信息', query);
    const stats = await this.meetingService.getStats({ startDate, endDate });

    this.logger.log('获取会议统计信息成功');
    return stats;
  }
}
