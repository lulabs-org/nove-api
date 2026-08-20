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
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { MinuteSummaryService } from '../services/minute-summary.service';
import {
  QueryMinuteSummaryDto,
  CreateMinuteSummaryDto,
  UpdateMinuteSummaryDto,
  MinuteSummaryDto,
  MinuteSummaryListResponseDto,
} from '../dto/minute-summary.dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

@ApiTags('Meet Summary')
@Controller('meetings/:meetingId/summaries')
@ApiBearerAuth()
export class MinuteSummaryController {
  private readonly logger = new Logger(MinuteSummaryController.name);

  constructor(private readonly meetingSummaryService: MinuteSummaryService) {}

  @Get()
  @RequirePermissions('minute:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取会议总结列表' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryListResponseDto })
  async getSummaries(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMinuteSummaryDto,
  ) {
    this.logger.log(`获取会议总结列表: ${meetingId}`, { query });
    return this.meetingSummaryService.findMany(
      meetingId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('minute:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取会议总结详情' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async getSummaryById(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`获取会议总结详情: ${id}`);
    return this.meetingSummaryService.findById(id);
  }

  @Post()
  @RequirePermissions('minute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建会议总结' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MinuteSummaryDto })
  async createSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Body(new ValidationPipe()) createParams: CreateMinuteSummaryDto,
  ) {
    this.logger.log(`创建会议总结: ${meetingId}`);
    return this.meetingSummaryService.create(meetingId, createParams);
  }

  @Put(':id')
  @RequirePermissions('minute:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新会议总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async updateSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMinuteSummaryDto,
  ) {
    this.logger.log(`更新会议总结: ${id}`);
    return this.meetingSummaryService.update(id, updateParams);
  }

  @Delete(':id')
  @RequirePermissions('minute:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除会议总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async deleteSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`删除会议总结: ${id}`);
    return this.meetingSummaryService.delete(id);
  }
}
