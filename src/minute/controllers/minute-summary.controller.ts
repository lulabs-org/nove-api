import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  CreateMinuteSummaryBodyDto,
  UpdateMinuteSummaryDto,
  MinuteSummaryDto,
} from '../dto/minute-summary.dto';
import { CuidPipe } from '@/common/pipes/cuid.pipe';

@ApiTags('Minute Summary')
@Controller('minutes/:minuteId/summary')
@ApiBearerAuth()
export class MinuteSummaryController {
  private readonly logger = new Logger(MinuteSummaryController.name);

  constructor(private readonly minuteSummaryService: MinuteSummaryService) {}

  @Get()
  @RequirePermissions('minute-summary:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取纪要总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async getSummary(@Param('minuteId', CuidPipe) minuteId: string) {
    this.logger.log(`获取纪要总结: ${minuteId}`);
    return this.minuteSummaryService.findByMinuteId(minuteId);
  }

  @Post()
  @RequirePermissions('minute-summary:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建或覆盖纪要总结' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MinuteSummaryDto })
  async createSummary(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) createParams: CreateMinuteSummaryBodyDto,
  ) {
    this.logger.log(`创建纪要总结: ${minuteId}`);
    return this.minuteSummaryService.create(minuteId, createParams);
  }

  @Put()
  @RequirePermissions('minute-summary:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新纪要总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async updateSummary(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) updateParams: UpdateMinuteSummaryDto,
  ) {
    this.logger.log(`更新纪要总结: minuteId=${minuteId}`);
    return this.minuteSummaryService.update(minuteId, updateParams);
  }

  @Delete()
  @RequirePermissions('minute-summary:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除纪要总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async deleteSummary(@Param('minuteId', CuidPipe) minuteId: string) {
    this.logger.log(`删除纪要总结: minuteId=${minuteId}`);
    return this.minuteSummaryService.delete(minuteId);
  }
}
