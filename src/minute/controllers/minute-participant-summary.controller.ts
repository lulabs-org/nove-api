import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  RequirePermissions,
  NoPermissionRequired,
} from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import { MinuteParticipantSummaryCrudService } from '../services/minute-participant-summary-crud.service';
import { MinuteParticipantSummaryService } from '../services/minute-participant-summary.service';
import {
  CreateMinuteParticipantSummaryDto,
  QueryMinuteParticipantSummaryDto,
  MinuteParticipantSummaryDto,
  MinuteParticipantSummaryListResponseDto,
  UpdateMinuteParticipantSummaryDto,
  GenerateParticipantSummaryDto,
} from '../dto/minute-participant-summary.dto';

@ApiTags('Recording Participant Summary')
@ApiBearerAuth()
@Controller('meetings/:meetingId/minutes/:minuteId/participant-summaries')
export class MinuteParticipantSummaryController {
  constructor(
    private readonly service: MinuteParticipantSummaryCrudService,
    private readonly aiService: MinuteParticipantSummaryService,
  ) {}

  @Get()
  @RequirePermissions('minute:read')
  @ApiResponse({
    status: HttpStatus.OK,
    type: MinuteParticipantSummaryListResponseDto,
  })
  list(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMinuteParticipantSummaryDto,
  ) {
    return this.service.findMany(
      meetingId,
      minuteId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('minute:read')
  @ApiResponse({ status: HttpStatus.OK, type: MinuteParticipantSummaryDto })
  get(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.findById(meetingId, minuteId, id);
  }

  @Post()
  @RequirePermissions('minute:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '为录制中的参会者创建新总结版本' })
  create(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) dto: CreateMinuteParticipantSummaryDto,
  ) {
    return this.service.create(meetingId, minuteId, dto);
  }

  @Put(':id')
  @RequirePermissions('minute:update')
  update(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateMinuteParticipantSummaryDto,
  ) {
    return this.service.update(meetingId, minuteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('minute:delete')
  delete(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.delete(meetingId, minuteId, id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @NoPermissionRequired()
  @ApiOperation({ summary: '生成参会者总结' })
  async generateSummaries(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('minuteId') minuteId: string,
    @Body() dto: GenerateParticipantSummaryDto,
  ) {
    return {
      success: true,
      message: '参会者总结生成完成',
      data: await this.aiService.generateSummaries({
        recordId: minuteId,
        ...dto,
      }),
    };
  }
}
