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
} from './dto/tracking-report.dto';
import { TrackingReportService } from './tracking-report.service';

@ApiTags('User Tracking Reports')
@ApiBearerAuth()
@Controller('tracking-reports')
export class TrackingReportController {
  constructor(private readonly service: TrackingReportService) {}
  @Post() @RequirePermissions('user:create') create(
    @Body(new ValidationPipe()) dto: CreateTrackingReportDto,
  ) {
    return this.service.create(dto);
  }
  @Get() @RequirePermissions('user:read') list(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryTrackingReportDto,
  ) {
    return this.service.list(query);
  }
  @Get(':id') @RequirePermissions('user:read') get(
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.get(id);
  }
  @Put(':id') @RequirePermissions('user:update') update(
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) dto: UpdateTrackingReportDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id') @RequirePermissions('user:delete') delete(
    @Param('id', CuidPipe) id: string,
  ) {
    return this.service.delete(id);
  }
}
