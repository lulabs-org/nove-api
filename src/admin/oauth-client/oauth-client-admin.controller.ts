import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  CreateOAuthClientDto,
  CreateOAuthClientResponseDto,
  DelegatableScopeDto,
  OAuthClientDto,
  OAuthClientListResponseDto,
  QueryOAuthClientsDto,
  RotateOAuthClientSecretResponseDto,
  UpdateOAuthClientDto,
} from './dto';
import { OAuthClientAdminService } from './oauth-client-admin.service';

@ApiTags('Admin / OAuth Clients')
@ApiBearerAuth()
@RequireAuth('jwt')
@Controller('admin/oauth-clients')
export class OAuthClientAdminController {
  constructor(private readonly service: OAuthClientAdminService) {}

  @Get()
  @RequirePermissions('oauth-client:read')
  @ApiResponse({ type: OAuthClientListResponseDto })
  list(@Query() query: QueryOAuthClientsDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions('oauth-client:create')
  @ApiResponse({ type: CreateOAuthClientResponseDto })
  create(@Body() dto: CreateOAuthClientDto, @Auth('userId') userId: string) {
    return this.service.create(dto, this.resolveUserId(userId));
  }

  @Get('delegatable-scopes')
  @RequirePermissions('oauth-client:read')
  @ApiResponse({ type: [DelegatableScopeDto] })
  listDelegatableScopes() {
    return this.service.listDelegatableScopes();
  }

  @Get(':id')
  @RequirePermissions('oauth-client:read')
  @ApiResponse({ type: OAuthClientDto })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('oauth-client:update')
  @ApiResponse({ type: OAuthClientDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOAuthClientDto,
    @Auth('userId') userId: string,
  ) {
    return this.service.update(id, dto, this.resolveUserId(userId));
  }

  @Post(':id/disable')
  @RequirePermissions('oauth-client:disable')
  @ApiOperation({ summary: 'Disable a client and revoke all delegated grants' })
  @ApiResponse({ type: OAuthClientDto })
  disable(@Param('id') id: string, @Auth('userId') userId: string) {
    return this.service.disable(id, this.resolveUserId(userId));
  }

  @Post(':id/enable')
  @RequirePermissions('oauth-client:disable')
  @ApiResponse({ type: OAuthClientDto })
  enable(@Param('id') id: string, @Auth('userId') userId: string) {
    return this.service.enable(id, this.resolveUserId(userId));
  }

  @Post(':id/rotate-secret')
  @RequirePermissions('oauth-client:rotate-secret')
  @ApiResponse({ type: RotateOAuthClientSecretResponseDto })
  rotateSecret(@Param('id') id: string, @Auth('userId') userId: string) {
    return this.service.rotateSecret(id, this.resolveUserId(userId));
  }

  private resolveUserId(userId: string | { id?: string }): string {
    return typeof userId === 'string' ? userId : userId?.id || '';
  }
}
