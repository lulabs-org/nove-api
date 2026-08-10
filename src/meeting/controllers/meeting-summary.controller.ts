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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/permission/decorators/permissions.decorator';
import { MeetingSummaryService } from '../services/meeting-summary.service';
import {
  QueryMeetingSummaryDto,
  CreateMeetingSummaryDto,
  UpdateMeetingSummaryDto,
  MeetingSummaryDto,
  MeetingSummaryListResponseDto,
} from '../dto/meeting-summary.dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

@ApiTags('Meet Summary')
@Controller('meetings/:meetingId/summaries')
@ApiBearerAuth()
export class MeetingSummaryController {
  private readonly logger = new Logger(MeetingSummaryController.name);

  constructor(private readonly meetingSummaryService: MeetingSummaryService) {}

  @Get()
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取会议总结列表' })
  @ApiResponse({ status: HttpStatus.OK, type: MeetingSummaryListResponseDto })
  async getSummaries(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMeetingSummaryDto,
  ) {
    this.logger.log(`获取会议总结列表: ${meetingId}`, { query });
    return this.meetingSummaryService.findMany(
      meetingId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取会议总结详情' })
  @ApiResponse({ status: HttpStatus.OK, type: MeetingSummaryDto })
  async getSummaryById(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`获取会议总结详情: ${id}`);
    return this.meetingSummaryService.findById(id);
  }

  @Post()
  @RequirePermissions('meeting:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建会议总结' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MeetingSummaryDto })
  async createSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Body(new ValidationPipe()) createParams: CreateMeetingSummaryDto,
  ) {
    this.logger.log(`创建会议总结: ${meetingId}`);
    return this.meetingSummaryService.create(meetingId, createParams);
  }

  @Put(':id')
  @RequirePermissions('meeting:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新会议总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MeetingSummaryDto })
  async updateSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMeetingSummaryDto,
  ) {
    this.logger.log(`更新会议总结: ${id}`);
    return this.meetingSummaryService.update(id, updateParams);
  }

  @Delete(':id')
  @RequirePermissions('meeting:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除会议总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MeetingSummaryDto })
  async deleteSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`删除会议总结: ${id}`);
    return this.meetingSummaryService.delete(id);
  }
}
