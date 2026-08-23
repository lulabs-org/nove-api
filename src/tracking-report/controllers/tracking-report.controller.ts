import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import {
  CreateTrackingReportDto,
  QueryTrackingReportDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';
import {
  TrackingReportDetailDto,
  TrackingReportListResponseDto,
} from '../dto/tracking-report-response.dto';
import { TrackingReportService } from '../services/tracking-report.service';

@ApiTags('Tracking Report')
@ApiBearerAuth()
@Controller('tracking-reports')
export class TrackingReportController {
  constructor(private readonly service: TrackingReportService) {}

  @Post()
  @RequirePermissions('tracking-report:create')
  @ApiOperation({
    summary: '创建追踪报告并创建或更新目标快照',
    description:
      '服务端根据 cadence、baseDate 和 timezone 推导 periodKey 及半开周期区间 [periodStart, periodEnd)。',
  })
  @ApiCreatedResponse({ type: TrackingReportDetailDto })
  @ApiConflictResponse({ description: '同一目标、报告类型和周期已存在' })
  create(
    @Body(new ValidationPipe({ transform: true })) dto: CreateTrackingReportDto,
  ) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions('tracking-report:read')
  @ApiOperation({ summary: '获取追踪报告列表' })
  @ApiOkResponse({ type: TrackingReportListResponseDto })
  list(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryTrackingReportDto,
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('tracking-report:read')
  @ApiOperation({ summary: '获取追踪报告详情及引用来源' })
  @ApiOkResponse({ type: TrackingReportDetailDto })
  get(@Param('id', CuidPipe) id: string) {
    return this.service.get(id);
  }

  @Put(':id')
  @RequirePermissions('tracking-report:update')
  @ApiOperation({
    summary: '更新追踪报告；传 sources 时整体替换引用来源',
    description: '报告周期由创建时确定，更新接口不允许修改周期身份。',
  })
  @ApiOkResponse({ type: TrackingReportDetailDto })
  update(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateTrackingReportDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tracking-report:delete')
  @ApiOperation({ summary: '软删除追踪报告' })
  delete(@Param('id', CuidPipe) id: string) {
    return this.service.delete(id);
  }
}
