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
import { CurrentUser, User } from '@/auth/decorators/user.decorator';
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
  create(@Body() dto: CreateOAuthClientDto, @User() user: CurrentUser) {
    return this.service.create(dto, user.id);
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
    @User() user: CurrentUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/disable')
  @RequirePermissions('oauth-client:disable')
  @ApiOperation({ summary: 'Disable a client and revoke all delegated grants' })
  @ApiResponse({ type: OAuthClientDto })
  disable(@Param('id') id: string, @User() user: CurrentUser) {
    return this.service.disable(id, user.id);
  }

  @Post(':id/enable')
  @RequirePermissions('oauth-client:disable')
  @ApiResponse({ type: OAuthClientDto })
  enable(@Param('id') id: string, @User() user: CurrentUser) {
    return this.service.enable(id, user.id);
  }

  @Post(':id/rotate-secret')
  @RequirePermissions('oauth-client:rotate-secret')
  @ApiResponse({ type: RotateOAuthClientSecretResponseDto })
  rotateSecret(@Param('id') id: string, @User() user: CurrentUser) {
    return this.service.rotateSecret(id, user.id);
  }
}
