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
import { RequirePermissions, NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import { ParticipantSummaryCrudService } from '../services/participant-summary-crud.service';
import { ParticipantSummaryService } from '../services/participant-summary.service';
import {
  CreateRecordingParticipantSummaryDto,
  QueryRecordingParticipantSummaryDto,
  RecordingParticipantSummaryDto,
  RecordingParticipantSummaryListResponseDto,
  UpdateRecordingParticipantSummaryDto,
  GenerateParticipantSummaryDto,
} from '../dto/participant-summary.dto';

@ApiTags('Recording Participant Summary')
@ApiBearerAuth()
@Controller('meetings/:meetingId/recordings/:recordingId/participant-summaries')
export class ParticipantSummaryController {
  constructor(
    private readonly service: ParticipantSummaryCrudService,
    private readonly aiService: ParticipantSummaryService,
  ) {}

  @Get()
  @RequirePermissions('meeting:read')
  @ApiResponse({
    status: HttpStatus.OK,
    type: RecordingParticipantSummaryListResponseDto,
  })
  list(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId', CuidPipe) recordingId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryRecordingParticipantSummaryDto,
  ) {
    return this.service.findMany(
      meetingId,
      recordingId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('meeting:read')
  @ApiResponse({ status: HttpStatus.OK, type: RecordingParticipantSummaryDto })
  get(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId', CuidPipe) recordingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.findById(meetingId, recordingId, id);
  }

  @Post()
  @RequirePermissions('meeting:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '为录制中的参会者创建新总结版本' })
  create(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId', CuidPipe) recordingId: string,
    @Body(new ValidationPipe()) dto: CreateRecordingParticipantSummaryDto,
  ) {
    return this.service.create(meetingId, recordingId, dto);
  }

  @Put(':id')
  @RequirePermissions('meeting:update')
  update(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId', CuidPipe) recordingId: string,
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateRecordingParticipantSummaryDto,
  ) {
    return this.service.update(meetingId, recordingId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('meeting:delete')
  delete(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId', CuidPipe) recordingId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.delete(meetingId, recordingId, id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @NoPermissionRequired()
  @ApiOperation({ summary: '生成参会者总结' })
  async generateSummaries(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Param('recordingId') recordingId: string,
    @Body() dto: GenerateParticipantSummaryDto,
  ) {
    return {
      success: true,
      message: '参会者总结生成完成',
      data: await this.aiService.generateSummaries({
        recordId: recordingId,
        ...dto,
      }),
    };
  }
}
