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
  ApiParam,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { ParticipantSummaryCrudService } from '../services/participant-summary-crud.service';
import {
  QueryParticipantSummaryDto,
  CreateParticipantSummaryDto,
  UpdateParticipantSummaryDto,
  ParticipantSummaryDto,
  ParticipantSummaryListResponseDto,
} from '../dto/participant-summary.dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

@ApiTags('Meet Participant Summary')
@Controller('meetings/:meetingId/participant-summaries')
@ApiBearerAuth()
export class ParticipantSummaryController {
  private readonly logger = new Logger(ParticipantSummaryController.name);

  constructor(
    private readonly participantSummaryCrudService: ParticipantSummaryCrudService,
  ) {}

  @Get()
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取参会者总结列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ParticipantSummaryListResponseDto,
  })
  async getSummaries(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryParticipantSummaryDto,
  ) {
    this.logger.log(`获取参会者总结列表: ${meetingId}`, { query });
    return this.participantSummaryCrudService.findMany(
      meetingId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('meeting:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取参会者总结详情' })
  @ApiParam({ name: 'meetingId', type: 'string', description: '会议ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ParticipantSummaryDto })
  async getSummaryById(@Param('id', CuidPipe) id: string) {
    this.logger.log(`获取参会者总结详情: ${id}`);
    return this.participantSummaryCrudService.findById(id);
  }

  @Post()
  @RequirePermissions('meeting:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建参会者总结' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ParticipantSummaryDto })
  async createSummary(
    @Param('meetingId', CuidPipe) meetingId: string,
    @Body(new ValidationPipe()) createParams: CreateParticipantSummaryDto,
  ) {
    this.logger.log(`创建参会者总结: ${meetingId}`);
    return this.participantSummaryCrudService.create(meetingId, createParams);
  }

  @Put(':id')
  @RequirePermissions('meeting:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新参会者总结' })
  @ApiParam({ name: 'meetingId', type: 'string', description: '会议ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ParticipantSummaryDto })
  async updateSummary(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateParticipantSummaryDto,
  ) {
    this.logger.log(`更新参会者总结: ${id}`);
    return this.participantSummaryCrudService.update(id, updateParams);
  }

  @Delete(':id')
  @RequirePermissions('meeting:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除参会者总结' })
  @ApiParam({ name: 'meetingId', type: 'string', description: '会议ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ParticipantSummaryDto })
  async deleteSummary(@Param('id', CuidPipe) id: string) {
    this.logger.log(`删除参会者总结: ${id}`);
    return this.participantSummaryCrudService.delete(id);
  }
}
