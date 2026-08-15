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
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import {
  CreateTrackingReportDto,
  QueryTrackingReportDto,
  TriggerSummaryDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';
import {
  ConflictResponseDto,
  JobStatusResponseDto,
  TriggerResponseDto,
} from '../dto/job.dto';
import { TrackingReportService } from '../services/tracking-report.service';
import { ReportGenerationQueueService } from '../queue/report-generation.queue.service';

@ApiTags('User Tracking Reports')
@ApiBearerAuth()
@Controller('tracking-reports')
export class TrackingReportController {
  constructor(
    private readonly service: TrackingReportService,
    private readonly reportGenerationQueue: ReportGenerationQueueService,
  ) {}

  @Post()
  @RequirePermissions('tracking-report:create')
  create(@Body(new ValidationPipe()) dto: CreateTrackingReportDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions('tracking-report:read')
  list(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryTrackingReportDto,
  ) {
    return this.service.list(query);
  }

  @Get('generate/:jobId/status')
  @RequirePermissions('tracking-report:create')
  @ApiOperation({
    summary: '查询异步生成任务的执行状态',
    description:
      '通过 POST /generate 返回的 jobId 查询任务进度和结果。Job 不存在或已过期时返回 { status: "expired" }，不会 404。',
  })
  @ApiOkResponse({ type: JobStatusResponseDto, description: '查询成功' })
  getGenerateStatus(
    @Param('jobId') jobId: string,
  ): Promise<JobStatusResponseDto> {
    return this.reportGenerationQueue.getJobStatus(jobId);
  }

  @Get(':id')
  @RequirePermissions('tracking-report:read')
  get(@Param('id', CuidPipe) id: string) {
    return this.service.get(id);
  }

  @Put(':id')
  @RequirePermissions('tracking-report:update')
  update(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateTrackingReportDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tracking-report:delete')
  delete(@Param('id', CuidPipe) id: string) {
    return this.service.delete(id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions('tracking-report:create')
  @ApiOperation({
    summary: '异步触发周期性总结生成',
    description:
      '将报告生成任务推入后台队列，立即返回 jobId。同一 cadence 同时只允许一个任务运行，重复触发返回 409。',
  })
  @ApiAcceptedResponse({
    type: TriggerResponseDto,
    description: '入队成功，返回 jobId',
  })
  @ApiBadRequestResponse({
    description: '不支持的 trackingType（如 PROJECT_PROGRESS）',
  })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description: '相同 cadence 已有任务在运行，或该周期已有已生成的报告',
  })
  generate(
    @Body(new ValidationPipe()) dto: TriggerSummaryDto,
  ): Promise<TriggerResponseDto> {
    return this.reportGenerationQueue.enqueue(dto);
  }
}
