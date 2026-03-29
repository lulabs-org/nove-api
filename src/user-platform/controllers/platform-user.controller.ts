import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PlatformUserService } from '../services/platform-user.service';
import type { Platform } from '@prisma/client';

@Controller('platform-users')
export class PlatformUserController {
  constructor(private readonly platformUserService: PlatformUserService) {}

  @Post()
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
  findById(@Param('id') id: string) {
    return this.platformUserService.findById(id);
  }

  @Get('union/:platform/:ptUnionId')
  findByUnionId(
    @Param('platform') platform: Platform,
    @Param('ptUnionId') ptUnionId: string,
  ) {
    return this.platformUserService.findByUnionId(platform, ptUnionId);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.platformUserService.findByUserId(userId);
  }

  @Get('platform/:platform/active')
  findActiveByPlatform(@Param('platform') platform: Platform) {
    return this.platformUserService.findActiveByPlatform(platform);
  }

  @Get('pt-user/:platform/:ptUserId')
  findByPtUserId(
    @Param('platform') platform: Platform,
    @Param('ptUserId') ptUserId: string,
  ) {
    return this.platformUserService.findByPtUserId(platform, ptUserId);
  }

  @Get('name/:platform/:displayName')
  findByPtName(
    @Param('platform') platform: Platform,
    @Param('displayName') displayName: string,
  ) {
    return this.platformUserService.findByPtName(platform, displayName);
  }

  @Get('phone/:platform/:countryCode/:phoneHash')
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
  updateLastSeen(@Param('id') id: string) {
    return this.platformUserService.updateLastSeen(id);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.platformUserService.activate(id);
  }

  @Put(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.platformUserService.deactivate(id);
  }

  @Delete(':id')
  deleteById(@Param('id') id: string) {
    return this.platformUserService.deleteById(id);
  }

  @Delete('phone/:countryCode/:phone')
  deleteByPhone(
    @Param('countryCode') countryCode: string,
    @Param('phone') phone: string,
  ) {
    return this.platformUserService.deleteByPhone(countryCode, phone);
  }
}
