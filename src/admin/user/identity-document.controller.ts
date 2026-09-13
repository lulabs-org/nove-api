import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import { AuthContext } from '@/auth/types/auth-context.interface';
import {
  CreateIdentityDocumentDto,
  IdentityDocumentDto,
  ReviewIdentityDocumentDto,
  UpdateIdentityDocumentDto,
} from './dto';
import { IdentityDocumentService } from './identity-document.service';

@ApiTags('Admin / User identity documents')
@ApiBearerAuth()
@Controller('admin/users/:userId/identity-documents')
export class IdentityDocumentController {
  constructor(private readonly service: IdentityDocumentService) {}

  @Get()
  @RequirePermissions('identity-document:read')
  @ApiOperation({ summary: '查询用户身份凭证，仅返回脱敏号码' })
  @ApiResponse({ status: 200, type: [IdentityDocumentDto] })
  list(@Param('userId') userId: string) {
    return this.service.list(userId);
  }

  @Post()
  @RequirePermissions('identity-document:write')
  @ApiOperation({ summary: '登记身份凭证草稿' })
  @ApiResponse({ status: 201, type: IdentityDocumentDto })
  create(
    @Param('userId') userId: string,
    @Body() dto: CreateIdentityDocumentDto,
    @Auth() auth: AuthContext,
  ) {
    return this.service.create(userId, dto, auth);
  }

  @Patch(':documentId')
  @RequirePermissions('identity-document:write')
  @ApiOperation({ summary: '修改身份凭证并重置为草稿' })
  @ApiResponse({ status: 200, type: IdentityDocumentDto })
  update(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateIdentityDocumentDto,
    @Auth() auth: AuthContext,
  ) {
    return this.service.update(userId, documentId, dto, auth);
  }

  @Post(':documentId/submit')
  @RequirePermissions('identity-document:write')
  @ApiOperation({ summary: '提交身份凭证审核' })
  @ApiResponse({ status: 201, type: IdentityDocumentDto })
  submit(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.submit(userId, documentId);
  }

  @Post(':documentId/review')
  @RequirePermissions('identity-document:review')
  @ApiOperation({ summary: '审核通过或驳回身份凭证' })
  @ApiResponse({ status: 201, type: IdentityDocumentDto })
  review(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReviewIdentityDocumentDto,
  ) {
    return this.service.review(userId, documentId, dto);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('identity-document:write')
  @ApiOperation({ summary: '软删除身份凭证' })
  delete(
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Auth() auth: AuthContext,
  ) {
    return this.service.delete(userId, documentId, auth);
  }
}
