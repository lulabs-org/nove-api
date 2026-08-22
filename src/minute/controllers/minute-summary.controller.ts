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

@ApiTags('Minute Summary')
@Controller('minutes/:minuteId/summaries')
@ApiBearerAuth()
export class MinuteSummaryController {
  private readonly logger = new Logger(MinuteSummaryController.name);

  constructor(private readonly minuteSummaryService: MinuteSummaryService) { }

  @Get()
  @RequirePermissions('minute-summary:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取纪要总结列表' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryListResponseDto })
  async getSummaries(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryMinuteSummaryDto,
  ) {
    this.logger.log(`获取纪要总结列表: ${minuteId}`, { query });
    return this.minuteSummaryService.findVersionsByMinuteId(
      minuteId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('minute-summary:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取纪要总结详情' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async getSummaryById(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`获取纪要总结详情: minuteId=${minuteId}, id=${id}`);
    return this.minuteSummaryService.findById(minuteId, id);
  }

  @Post()
  @RequirePermissions('minute-summary:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建纪要总结' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MinuteSummaryDto })
  async createSummary(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) createParams: CreateMinuteSummaryDto,
  ) {
    this.logger.log(`创建纪要总结: ${minuteId}`);
    return this.minuteSummaryService.create(minuteId, createParams);
  }

  @Put(':id')
  @RequirePermissions('minute-summary:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新纪要总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async updateSummary(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
    @Body(new ValidationPipe()) updateParams: UpdateMinuteSummaryDto,
  ) {
    this.logger.log(`更新纪要总结: minuteId=${minuteId}, id=${id}`);
    return this.minuteSummaryService.update(minuteId, id, updateParams);
  }

  @Delete(':id')
  @RequirePermissions('minute-summary:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除纪要总结' })
  @ApiResponse({ status: HttpStatus.OK, type: MinuteSummaryDto })
  async deleteSummary(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('id', CuidPipe) id: string,
  ) {
    this.logger.log(`删除纪要总结: minuteId=${minuteId}, id=${id}`);
    return this.minuteSummaryService.delete(minuteId, id);
  }
}
