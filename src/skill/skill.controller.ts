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
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { ListSkillsDto, SkillUploadDto, UpdateSkillDto } from './skill.dto';
import { MAX_SKILL_ZIP_BYTES } from './skill-zip.validator';
import { SkillService, type SkillUploadFile } from './skill.service';

const uploadBody = {
  schema: {
    type: 'object',
    required: ['file', 'version'],
    properties: {
      file: { type: 'string', format: 'binary' },
      version: { type: 'string' },
      changelog: { type: 'string' },
    },
  },
};

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('api/v1/skills')
export class SkillController {
  constructor(private readonly skills: SkillService) {}

  @Post('import-zip')
  @RequirePermissions('skill:create')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SKILL_ZIP_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @ApiOperation({ summary: '从 Zip 导入技能及首个版本' })
  importZip(
    @Body() dto: SkillUploadDto,
    @UploadedFile() file?: SkillUploadFile,
  ) {
    return this.skills.importZip(dto, file);
  }

  @Get()
  @RequirePermissions('skill:read')
  list(@Query() query: ListSkillsDto) {
    return this.skills.list(query);
  }

  @Get(':id')
  @RequirePermissions('skill:read')
  get(@Param('id') id: string) {
    return this.skills.get(id);
  }

  @Patch(':id')
  @RequirePermissions('skill:update')
  update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skills.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('skill:delete')
  delete(@Param('id') id: string) {
    return this.skills.delete(id);
  }

  @Post(':id/versions')
  @RequirePermissions('skill:update')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SKILL_ZIP_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  addVersion(
    @Param('id') id: string,
    @Body() dto: SkillUploadDto,
    @UploadedFile() file?: SkillUploadFile,
  ) {
    return this.skills.addVersion(id, dto, file);
  }

  @Get(':id/versions/:version/download')
  @RequirePermissions('skill:read')
  async download(
    @Param('id') id: string,
    @Param('version') version: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { stream, fileName } = await this.skills.download(id, version);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(stream);
  }

  @Post(':id/versions/:version/activate')
  @RequirePermissions('skill:update')
  activate(@Param('id') id: string, @Param('version') version: string) {
    return this.skills.activate(id, version);
  }

  @Delete(':id/versions/:version')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('skill:delete')
  deleteVersion(@Param('id') id: string, @Param('version') version: string) {
    return this.skills.deleteVersion(id, version);
  }
}
