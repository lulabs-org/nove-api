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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import {
  CreateTrackingReportDto,
  QueryTrackingReportDto,
  UpdateTrackingReportDto,
} from '../dto/tracking-report.dto';
import { TrackingReportService } from '../services/tracking-report.service';
import { PeriodicReportGenerator } from '../services/periodic-report.generator';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

@ApiTags('User Tracking Reports')
@ApiBearerAuth()
@Controller('tracking-reports')
export class TrackingReportController {
  constructor(
    private readonly service: TrackingReportService,
    private readonly periodicReportGenerator: PeriodicReportGenerator,
  ) { }
  @Post()
  @RequirePermissions('tracking-report:create')
  create(
    @Body(new ValidationPipe()) dto: CreateTrackingReportDto,
  ) {
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

  @Get(':id')
  @RequirePermissions('tracking-report:read')
  get(
    @Param('id', CuidPipe) id: string,
  ) {
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

  @Delete(':id') @RequirePermissions('tracking-report:delete') delete(
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.delete(id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动或由定时任务触发周期性总结' })
  @RequirePermissions('tracking-report:create')
  process(@Body(new ValidationPipe()) dto: TriggerSummaryDto) {
    return this.periodicReportGenerator.generateSummaries(dto);
  }
}
