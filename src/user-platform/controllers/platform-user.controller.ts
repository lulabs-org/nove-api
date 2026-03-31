import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { PlatformUserService } from '../services/platform-user.service';
import { Platform } from '@prisma/client';
import {
  CreatePlatformUserDto,
  UpdatePlatformUserDto,
  UpsertPlatformUserRequestDto,
} from '../dto';
import { PlatformUserDto, PlatformUserWithProfileDto } from '../types';

const nullablePlatformUserSchema = {
  nullable: true,
  allOf: [{ $ref: getSchemaPath(PlatformUserDto) }],
};

@ApiTags('Platform Users')
@ApiExtraModels(
  PlatformUserDto,
  PlatformUserWithProfileDto,
  UpsertPlatformUserRequestDto,
)
@Controller('platform-users')
export class PlatformUserController {
  constructor(private readonly platformUserService: PlatformUserService) {}

  @Post()
  @ApiOperation({
    summary: '创建平台用户',
    description: '创建一条平台用户记录，用于绑定第三方平台身份与本地用户。',
  })
  @ApiBody({ type: CreatePlatformUserDto })
  @ApiResponse({
    status: 201,
    description: '平台用户创建成功',
    type: PlatformUserDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求体参数无效',
  })
  create(
    @Body()
    data: {
      platform: Platform;
      ptUnionId: string;
      ptUserId?: string;
      displayName?: string;
      countryCode?: string;
      phone?: string;
      phoneHash?: string;
      localUserId?: string;
      active?: boolean;
    },
  ) {
    return this.platformUserService.create(data);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取平台用户详情',
    description: '根据平台用户 ID 查询详情，并附带关联的本地用户基础资料。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '平台用户详情',
    type: PlatformUserWithProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: '平台用户不存在',
  })
  findById(@Param('id') id: string) {
    return this.platformUserService.findById(id);
  }

  @Get('union/:platform/:ptUnionId')
  @ApiOperation({
    summary: '根据联合 ID 查询平台用户',
    description: '按平台类型和平台联合 ID 查询平台用户；未命中时返回 null。',
  })
  @ApiParam({
    name: 'platform',
    description: '平台类型',
    enum: Platform,
    example: 'FEISHU',
  })
  @ApiParam({
    name: 'ptUnionId',
    description: '平台联合 ID',
    example: 'union_id_123456',
  })
  @ApiResponse({
    status: 200,
    description: '查询结果；未命中时返回 null',
    schema: nullablePlatformUserSchema,
  })
  findByUnionId(
    @Param('platform') platform: Platform,
    @Param('ptUnionId') ptUnionId: string,
  ) {
    return this.platformUserService.findByUnionId(platform, ptUnionId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: '根据本地用户 ID 查询绑定的平台用户',
    description: '返回指定本地用户下已绑定的全部平台用户记录。',
  })
  @ApiParam({
    name: 'userId',
    description: '本地用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '平台用户列表',
    type: [PlatformUserDto],
  })
  findByUserId(@Param('userId') userId: string) {
    return this.platformUserService.findByUserId(userId);
  }

  @Get('platform/:platform/active')
  @ApiOperation({
    summary: '查询指定平台的活跃用户',
    description: '返回指定平台下处于激活状态的平台用户列表。',
  })
  @ApiParam({
    name: 'platform',
    description: '平台类型',
    enum: Platform,
    example: 'FEISHU',
  })
  @ApiResponse({
    status: 200,
    description: '活跃平台用户列表',
    type: [PlatformUserDto],
  })
  findActiveByPlatform(@Param('platform') platform: Platform) {
    return this.platformUserService.findActiveByPlatform(platform);
  }

  @Get('pt-user/:platform/:ptUserId')
  @ApiOperation({
    summary: '根据平台用户 ID 查询平台用户',
    description:
      '按平台类型和第三方平台用户 ID 查询平台用户；未命中时返回 null。',
  })
  @ApiParam({
    name: 'platform',
    description: '平台类型',
    enum: Platform,
    example: 'FEISHU',
  })
  @ApiParam({
    name: 'ptUserId',
    description: '第三方平台用户 ID',
    example: 'user_123456',
  })
  @ApiResponse({
    status: 200,
    description: '查询结果；未命中时返回 null',
    schema: nullablePlatformUserSchema,
  })
  findByPtUserId(
    @Param('platform') platform: Platform,
    @Param('ptUserId') ptUserId: string,
  ) {
    return this.platformUserService.findByPtUserId(platform, ptUserId);
  }

  @Get('name/:platform/:displayName')
  @ApiOperation({
    summary: '根据显示名称查询平台用户',
    description: '按平台类型和显示名称查询活跃平台用户；未命中时返回 null。',
  })
  @ApiParam({
    name: 'platform',
    description: '平台类型',
    enum: Platform,
    example: 'FEISHU',
  })
  @ApiParam({
    name: 'displayName',
    description: '平台显示名称',
    example: '张三',
  })
  @ApiResponse({
    status: 200,
    description: '查询结果；未命中时返回 null',
    schema: nullablePlatformUserSchema,
  })
  findByPtName(
    @Param('platform') platform: Platform,
    @Param('displayName') displayName: string,
  ) {
    return this.platformUserService.findByPtName(platform, displayName);
  }

  @Get('phone/:platform/:countryCode/:phoneHash')
  @ApiOperation({
    summary: '根据手机号哈希查询平台用户',
    description:
      '按平台类型、国家代码和手机号哈希查询活跃平台用户；未命中时返回 null。',
  })
  @ApiParam({
    name: 'platform',
    description: '平台类型',
    enum: Platform,
    example: 'FEISHU',
  })
  @ApiParam({
    name: 'countryCode',
    description: '国家代码',
    example: '+86',
  })
  @ApiParam({
    name: 'phoneHash',
    description: '手机号哈希',
    example: 'hashed_phone_value',
  })
  @ApiResponse({
    status: 200,
    description: '查询结果；未命中时返回 null',
    schema: nullablePlatformUserSchema,
  })
  findByPhoneHash(
    @Param('platform') platform: Platform,
    @Param('countryCode') countryCode: string,
    @Param('phoneHash') phoneHash: string,
  ) {
    return this.platformUserService.findByPhoneHash(
      platform,
      countryCode,
      phoneHash,
    );
  }

  @Post('upsert')
  @ApiOperation({
    summary: '幂等写入平台用户',
    description: '按 platform + ptUnionId 作为唯一键创建或更新平台用户记录。',
  })
  @ApiBody({ type: UpsertPlatformUserRequestDto })
  @ApiResponse({
    status: 201,
    description: '平台用户写入成功',
    type: PlatformUserDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求体参数无效',
  })
  upsert(
    @Body()
    data: {
      where: { platform: Platform; ptUnionId: string };
      data: {
        ptUserId?: string;
        displayName?: string;
        countryCode?: string;
        phone?: string;
        phoneHash?: string;
        localUserId?: string;
      };
    },
  ) {
    return this.platformUserService.upsert(data.where, data.data);
  }

  @Post('upsert-many')
  @ApiOperation({
    summary: '批量幂等写入平台用户',
    description: '批量按 platform + ptUnionId 创建或更新平台用户记录。',
  })
  @ApiBody({ type: [UpsertPlatformUserRequestDto] })
  @ApiResponse({
    status: 201,
    description: '批量写入结果',
    type: [PlatformUserDto],
  })
  @ApiResponse({
    status: 400,
    description: '请求体参数无效',
  })
  upsertMany(
    @Body()
    items: Array<{
      where: { platform: Platform; ptUnionId: string };
      data: {
        ptUserId?: string;
        displayName?: string;
        countryCode?: string;
        phone?: string;
        phoneHash?: string;
        localUserId?: string;
      };
    }>,
  ) {
    return this.platformUserService.upsertMany(items);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新平台用户',
    description: '根据平台用户 ID 更新可编辑的基础字段。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiBody({ type: UpdatePlatformUserDto })
  @ApiResponse({
    status: 200,
    description: '平台用户更新成功',
    type: PlatformUserDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求体参数无效',
  })
  update(
    @Param('id') id: string,
    @Body()
    data: {
      ptUserId?: string;
      displayName?: string;
      countryCode?: string;
      phone?: string;
      phoneHash?: string;
      localUserId?: string;
      active?: boolean;
    },
  ) {
    return this.platformUserService.update(id, data);
  }

  @Put(':id/last-seen')
  @ApiOperation({
    summary: '更新最后活跃时间',
    description: '将指定平台用户的 lastSeenAt 更新为当前时间。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '最后活跃时间更新成功',
    type: PlatformUserDto,
  })
  updateLastSeen(@Param('id') id: string) {
    return this.platformUserService.updateLastSeen(id);
  }

  @Put(':id/activate')
  @ApiOperation({
    summary: '激活平台用户',
    description: '将指定平台用户状态更新为激活。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '平台用户已激活',
    type: PlatformUserDto,
  })
  activate(@Param('id') id: string) {
    return this.platformUserService.activate(id);
  }

  @Put(':id/deactivate')
  @ApiOperation({
    summary: '停用平台用户',
    description: '将指定平台用户状态更新为停用。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '平台用户已停用',
    type: PlatformUserDto,
  })
  deactivate(@Param('id') id: string) {
    return this.platformUserService.deactivate(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除平台用户',
    description: '根据平台用户 ID 删除一条平台用户记录。',
  })
  @ApiParam({
    name: 'id',
    description: '平台用户 ID',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @ApiResponse({
    status: 200,
    description: '已删除的平台用户',
    type: PlatformUserDto,
  })
  deleteById(@Param('id') id: string) {
    return this.platformUserService.deleteById(id);
  }

  @Delete('phone/:countryCode/:phone')
  @ApiOperation({
    summary: '按手机号删除平台用户',
    description:
      '根据国家代码和手机号批量删除匹配的平台用户记录，并返回删除数量。',
  })
  @ApiParam({
    name: 'countryCode',
    description: '国家代码',
    example: '+86',
  })
  @ApiParam({
    name: 'phone',
    description: '手机号',
    example: '13800138000',
  })
  @ApiResponse({
    status: 200,
    description: '删除数量',
    schema: {
      type: 'integer',
      example: 1,
    },
  })
  deleteByPhone(
    @Param('countryCode') countryCode: string,
    @Param('phone') phone: string,
  ) {
    return this.platformUserService.deleteByPhone(countryCode, phone);
  }
}
