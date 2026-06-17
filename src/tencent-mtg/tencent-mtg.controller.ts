import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TencentMtgSyncService } from './tencent-mtg-sync.service';
import { SyncRecordingsDto } from './dto/sync-recordings.dto';

/**
 * 腾讯会议管理控制器
 * 提供主动拉取腾讯会议数据的接口
 */
@ApiTags('Tencent Meeting')
@Controller('tencent-mtg')
export class TencentMtgController {
  private readonly logger = new Logger(TencentMtgController.name);

  constructor(private readonly syncService: TencentMtgSyncService) {}

  /**
   * 触发同步腾讯会议录制列表
   * 从腾讯会议 API 拉取账户级录制列表，并通过 upsert 补充 Meeting 和 MeetingRecording 数据
   */
  @Post('sync-recordings')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '同步腾讯会议录制列表',
    description:
      '将时间范围切片并发送到异步队列进行处理，不阻塞返回。默认同步最近 7 天。',
  })
  @ApiResponse({
    status: 202,
    description: '异步同步任务已加入队列，返回任务 IDs',
  })
  async syncRecordings(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SyncRecordingsDto,
  ) {
    this.logger.log(
      `Sync recordings requested: startTime=${dto.startTime}, endTime=${dto.endTime}`,
    );

    const result = await this.syncService.syncRecordings(
      dto.startTime,
      dto.endTime,
      dto.operatorId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
