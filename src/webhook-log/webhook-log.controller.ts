import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookLogService } from './webhook-log.service';
import { QueryWebhookLogDto } from './dto/query-webhook-log.dto';
import { WebhookLogListResponseDto, WebhookLogDto } from './dto/webhook-log.dto';

@ApiTags('Admin / Webhook Logs')
@ApiBearerAuth()
@Controller('webhook-logs')
export class WebhookLogController {
  constructor(private readonly webhookLogService: WebhookLogService) {}

  @Get()
  @ApiOperation({ summary: '分页获取 Webhook 日志' })
  @ApiResponse({ status: 200, type: WebhookLogListResponseDto })
  async findAll(@Query() query: QueryWebhookLogDto): Promise<WebhookLogListResponseDto> {
    const { page, pageSize, provider, event, status } = query;
    const { total, data } = await this.webhookLogService.findAll({ page, pageSize, provider, event, status });
    
    return {
      total,
      data: data.map(item => ({
        ...item,
        errorMessage: item.errorMessage || undefined,
        externalId: item.externalId || undefined,
      })) as any[],
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单条 Webhook 日志详情' })
  @ApiResponse({ status: 200, type: WebhookLogDto })
  async findOne(@Param('id') id: string) {
    const log = await this.webhookLogService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Webhook log with ID ${id} not found`);
    }
    return {
      ...log,
      errorMessage: log.errorMessage || undefined,
      externalId: log.externalId || undefined,
    } as any;
  }
}
