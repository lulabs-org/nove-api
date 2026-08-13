import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import {
  ChannelDto,
  ChannelListResponseDto,
  CreateChannelDto,
  QueryChannelDto,
  UpdateChannelDto,
  UpdateChannelStatusDto,
} from '../dto';
import { ChannelService } from '../services/channel.service';

@ApiTags('Admin - Channels')
@ApiBearerAuth()
@Controller('admin/channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  @RequirePermissions('channel:read')
  @ApiOperation({ summary: '渠道列表' })
  @ApiResponse({ status: 200, type: ChannelListResponseDto })
  findAll(@Query() query: QueryChannelDto): Promise<ChannelListResponseDto> {
    return this.channelService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('channel:read')
  @ApiOperation({ summary: '渠道详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ChannelDto })
  findById(@Param('id', ParseIntPipe) id: number): Promise<ChannelDto> {
    return this.channelService.findById(id);
  }

  @Post()
  @RequirePermissions('channel:create')
  @ApiOperation({ summary: '创建渠道' })
  @ApiResponse({ status: 201, type: ChannelDto })
  create(@Body() dto: CreateChannelDto): Promise<ChannelDto> {
    return this.channelService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('channel:update')
  @ApiOperation({ summary: '更新渠道' })
  @ApiResponse({ status: 200, type: ChannelDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
  ): Promise<ChannelDto> {
    return this.channelService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('channel:update')
  @ApiOperation({ summary: '更新渠道状态' })
  @ApiResponse({ status: 200, type: ChannelDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelStatusDto,
  ): Promise<ChannelDto> {
    return this.channelService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @RequirePermissions('channel:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除未被订单引用的渠道' })
  @ApiResponse({ status: 204, description: '渠道删除成功' })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.channelService.delete(id);
  }
}
