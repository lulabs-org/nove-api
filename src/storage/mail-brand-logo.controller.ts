import {
  Controller,
  Delete,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CurrentOrg } from '@/auth/decorators';
import {
  MailBrandLogoService,
  MailBrandLogoUploadFile,
} from './mail-brand-logo.service';

@ApiTags('Admin / Integrations')
@ApiBearerAuth()
@Controller('admin/integrations/mail/brand-logo')
export class MailBrandLogoController {
  constructor(private readonly service: MailBrandLogoService) {}

  @Put()
  @RequirePermissions('system:config:write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Upload and activate the mail brand logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  upload(
    @CurrentOrg() orgId: string,
    @UploadedFile() file?: MailBrandLogoUploadFile,
  ) {
    return this.service.upload(orgId, file);
  }

  @Delete()
  @RequirePermissions('system:config:write')
  @ApiOperation({ summary: 'Remove the active mail brand logo' })
  remove(@CurrentOrg() orgId: string) {
    return this.service.remove(orgId);
  }
}
