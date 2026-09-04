import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CuidPipe } from '@/common/pipes/cuid.pipe';
import { SpeakerSummaryCrudService } from '../services/speaker-summary-crud.service';
import { SpeakerSummaryService } from '../services/speaker-summary.service';
import {
  CreateSpeakerSummaryDto,
  QuerySpeakerSummaryDto,
  SpeakerSummaryDto,
  SpeakerSummaryListResponseDto,
  UpdateSpeakerSummaryDto,
  GenerateParticipantSummaryDto,
} from '../dto/speaker-summary.dto';
import { MinuteService } from '../services/minute.service';
import { Auth } from '@/auth/decorators/auth.decorator';
import { AuthContext } from '@/auth/types/auth-context.interface';

@ApiTags('Minute Speaker Summary')
@ApiBearerAuth()
@Controller('minutes/:minuteId/speaker-summaries')
export class SpeakerSummaryController {
  constructor(
    private readonly service: SpeakerSummaryCrudService,
    private readonly aiService: SpeakerSummaryService,
    private readonly minuteService: MinuteService,
  ) {}

  @Get()
  @RequirePermissions('speaker-summary:read')
  @ApiOperation({ summary: '获取参会者总结列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SpeakerSummaryListResponseDto,
  })
  async list(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Query(new ValidationPipe({ transform: true }))
    query: QuerySpeakerSummaryDto,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return this.service.findMany(minuteId, query.page, query.limit);
  }

  @Get(':summaryId')
  @RequirePermissions('speaker-summary:read')
  @ApiOperation({ summary: '获取参会者总结详情' })
  @ApiResponse({ status: HttpStatus.OK, type: SpeakerSummaryDto })
  async get(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('summaryId', CuidPipe) summaryId: string,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return this.service.findById(minuteId, summaryId);
  }

  @Post()
  @RequirePermissions('speaker-summary:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建参会者总结' })
  async create(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) dto: CreateSpeakerSummaryDto,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return this.service.create(minuteId, dto);
  }

  @Put(':summaryId')
  @RequirePermissions('speaker-summary:update')
  @ApiOperation({ summary: '更新参会者总结' })
  async update(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('summaryId', CuidPipe) summaryId: string,
    @Body(new ValidationPipe()) dto: UpdateSpeakerSummaryDto,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return this.service.update(minuteId, summaryId, dto);
  }

  @Delete(':summaryId')
  @RequirePermissions('speaker-summary:delete')
  @ApiOperation({ summary: '删除参会者总结' })
  async delete(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Param('summaryId', CuidPipe) summaryId: string,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return this.service.delete(minuteId, summaryId);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('speaker-summary:create')
  @ApiOperation({ summary: '生成参会者总结' })
  async generateSummaries(
    @Param('minuteId', CuidPipe) minuteId: string,
    @Body(new ValidationPipe()) dto: GenerateParticipantSummaryDto,
    @Auth() auth: AuthContext,
  ) {
    await this.assertMinute(minuteId, auth);
    return {
      success: true,
      message: '参会者总结生成完成',
      data: await this.aiService.generateSummaries({
        recordId: minuteId,
        ...dto,
      }),
    };
  }

  private assertMinute(minuteId: string, auth: AuthContext) {
    return this.minuteService.getById(
      minuteId,
      auth.permissions.includes('drive:admin')
        ? undefined
        : this.minuteService.requireOrgId(auth.orgId),
    );
  }
}
