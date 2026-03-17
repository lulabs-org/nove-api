import {
  Controller,
  Post,
  Body,
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
import { SyncMeetingDetailService } from '../services/sync-meeting-detail.service';
import { SyncMeetingDetailDto, SyncMeetingDetailResponseDto } from '../dto';

@ApiTags('Tencent Meeting')
@Controller('tencent-mtg/sync')
@ApiBearerAuth()
export class SyncMeetingDetailController {
  private readonly logger = new Logger(SyncMeetingDetailController.name);

  constructor(
    private readonly syncMeetingDetailService: SyncMeetingDetailService,
  ) {}

  @Post('meeting-detail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '同步腾讯会议详情',
    description: '通过会议ID从腾讯会议API获取会议详情并更新到数据库',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '会议详情同步成功',
    type: SyncMeetingDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async syncMeetingDetail(
    @Body(new ValidationPipe({ transform: true }))
    body: SyncMeetingDetailDto,
  ): Promise<SyncMeetingDetailResponseDto> {
    this.logger.log(
      `收到会议详情同步请求: meetingId=${body.meetingId}, subMeetingId=${body.subMeetingId}`,
    );

    try {
      const result = await this.syncMeetingDetailService.syncMeetingDetail(
        body.meetingId,
        body.subMeetingId || '__ROOT__',
        body.userId,
      );

      this.logger.log(
        `会议详情同步成功: meetingId=${body.meetingId}, subMeetingId=${body.subMeetingId}`,
      );

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `会议详情同步失败: meetingId=${body.meetingId}, subMeetingId=${body.subMeetingId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
