import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { TMeetSyncService } from '../services/sync.service';
import { TMeetUserLinkService } from '../services/user-link.service';
import { SyncRecordingsDto } from '../dto/sync-recordings.dto';

/**
 * 腾讯会议管理控制器
 * 提供主动拉取腾讯会议数据的接口
 */
@ApiTags('TMeet')
@ApiBearerAuth()
@Controller('tmeet')
@RequirePermissions('system:config')
export class TMeetController {
  private readonly logger = new Logger(TMeetController.name);

  constructor(
    private readonly syncService: TMeetSyncService,
    private readonly userLinkService: TMeetUserLinkService,
  ) {}

  /**
   * 触发同步腾讯会议录制列表
   * 从腾讯会议 API 拉取账户级录制列表，并通过 upsert 补充 Meeting 和 Minute 数据
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
      `Sync recordings requested: startDate=${dto.startDate?.toISOString() ?? 'undefined'}, endDate=${dto.endDate?.toISOString() ?? 'undefined'}, syncTranscripts=${dto.syncTranscripts ?? true}, syncSummaries=${dto.syncSummaries ?? true}, syncParticipants=${dto.syncParticipants ?? true}`,
    );

    const startTime = dto.startDate
      ? Math.floor(dto.startDate.getTime() / 1000)
      : undefined;
    const endTime = dto.endDate
      ? Math.floor(dto.endDate.getTime() / 1000)
      : undefined;

    const result = await this.syncService.syncRecordings(
      startTime,
      endTime,
      dto.operatorId,
      dto.forceReSyncTranscript,
      dto.syncTranscripts,
      dto.syncSummaries,
      dto.syncParticipants,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 通过手机号哈希值将腾讯会议平台用户关联到本地用户
   * 查找 platform=TENCENT_MEETING、localUserId 为空、ptUserId 为空的 PlatformUser，
   * 与 UserPhoneHash 表的 hashValue 进行比对，匹配成功则写入 localUserId。
   */
  @Post('link-users-by-phone-hash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '通过手机号哈希关联腾讯会议用户与本地用户',
    description:
      '遍历未关联本地用户（localUserId=null）且 ptUserId 为空的腾讯会议平台用户，' +
      '通过比对 phoneHash 与 UserPhoneHash 表的 hashValue，' +
      '将匹配成功的记录关联到对应的本地 User。',
  })
  @ApiResponse({
    status: 200,
    description: '关联执行完成，返回统计结果',
    schema: {
      example: {
        success: true,
        data: { total: 10, linked: 8, skipped: 2 },
      },
    },
  })
  async linkUsersByPhoneHash() {
    this.logger.log('Link users by phone hash requested.');
    const result = await this.userLinkService.linkUsersByPhoneHash();
    return {
      success: true,
      data: result,
    };
  }
}
