import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CurrentOrg } from '@/auth/decorators';
import { OrganizationDto } from '@/admin/org/dto';
import { OrganizationProfileDto } from './organization-profile.dto';
import {
  OrganizationProfileService,
  OrganizationLogoUploadFile,
} from './organization-profile.service';

@ApiTags('Admin / Organizations')
@ApiBearerAuth()
@ApiExtraModels(OrganizationProfileDto)
@Controller('admin/orgs/:orgId/profile')
export class OrganizationProfileController {
  constructor(private readonly service: OrganizationProfileService) {}

  @Put()
  @RequirePermissions('org:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: '保存企业信息及上传的 Logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(OrganizationProfileDto) },
        {
          type: 'object',
          properties: { file: { type: 'string', format: 'binary' } },
        },
      ],
    },
  })
  @ApiResponse({ status: 200, type: OrganizationDto })
  save(
    @CurrentOrg() currentOrgId: string,
    @Param('orgId') orgId: string,
    @Body() dto: OrganizationProfileDto,
    @UploadedFile() file?: OrganizationLogoUploadFile,
  ) {
    if (currentOrgId !== orgId)
      throw new ForbiddenException('只能修改当前企业的信息');
    return this.service.save(orgId, dto, file);
  }
}
