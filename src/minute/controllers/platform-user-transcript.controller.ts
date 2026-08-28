import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAllPermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import {
  PlatformUserMinuteTranscriptsResponseDto,
  PlatformUserTranscriptContextResponseDto,
  QueryPlatformUserMinuteTranscriptsDto,
  QueryPlatformUserTranscriptContextDto,
} from '../dto/platform-user-transcript.dto';
import { PlatformUserTranscriptService } from '../services/platform-user-transcript.service';

@ApiTags('Minute')
@ApiBearerAuth()
@Controller('platform-users/:platformUserId')
export class PlatformUserTranscriptController {
  constructor(private readonly service: PlatformUserTranscriptService) {}

  @Get('minutes/transcripts')
  @RequireAllPermissions('platform-user:read', 'minute:read')
  @ApiOperation({ summary: '查询用户有发言的录制及转写段落' })
  @ApiParam({ name: 'platformUserId', description: '平台用户记录 ID' })
  @ApiOkResponse({ type: PlatformUserMinuteTranscriptsResponseDto })
  @ApiBadRequestResponse({ description: '时间格式、顺序或跨度无效' })
  @ApiForbiddenResponse({ description: '缺少所需读取权限' })
  @ApiNotFoundResponse({ description: '平台用户不存在' })
  getMinuteTranscripts(
    @Param('platformUserId', CuidPipe) platformUserId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryPlatformUserMinuteTranscriptsDto,
  ) {
    return this.service.getMinuteTranscripts(
      platformUserId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('minutes/:minuteId/transcript-context')
  @RequireAllPermissions('platform-user:read', 'minute:read')
  @ApiOperation({ summary: '获取用户转写上下文' })
  @ApiParam({ name: 'platformUserId', description: '平台用户记录 ID' })
  @ApiParam({ name: 'minuteId', description: 'Minute ID' })
  @ApiOkResponse({ type: PlatformUserTranscriptContextResponseDto })
  @ApiBadRequestResponse({ description: '上下文深度无效' })
  @ApiForbiddenResponse({ description: '缺少所需读取权限' })
  @ApiNotFoundResponse({
    description: '平台用户、Minute、参会关系或转写不存在',
  })
  getTranscriptContext(
    @Param('platformUserId', CuidPipe) platformUserId: string,
    @Param('minuteId', CuidPipe) minuteId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryPlatformUserTranscriptContextDto,
  ) {
    return this.service.getTranscriptContext(
      platformUserId,
      minuteId,
      query.depth,
    );
  }
}
