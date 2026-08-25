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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import {
  AdminUserDto,
  AdminUserListResponseDto,
  CreateAdminUserDto,
  QueryUsersDto,
  UpdateAdminUserDto,
  UserImportResponseDto,
} from './dto';
import { AdminUserService } from './user.service';

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

  @Get()
  @ApiOperation({ summary: '分页查询全局用户' })
  @ApiResponse({ status: 200, type: AdminUserListResponseDto })
  @RequirePermissions('user:read')
  list(@Query() query: QueryUsersDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询全局用户详情' })
  @ApiResponse({ status: 200, type: AdminUserDto })
  @RequirePermissions('user:read')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建全局用户' })
  @ApiResponse({ status: 201, type: AdminUserDto })
  @RequirePermissions('user:create')
  create(@Body() dto: CreateAdminUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新全局用户' })
  @ApiResponse({ status: 200, type: AdminUserDto })
  @RequirePermissions('user:update')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '软删除全局用户' })
  @RequirePermissions('user:delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: '通过 CSV 或 XLSX 文件批量导入用户',
    description:
      '姓名字段推荐使用 fullName（完整姓名/姓名）；兼容旧模板的 firstName/lastName（名/姓）并在导入时合并，不代表已实名认证。',
  })
  @ApiResponse({ status: 201, type: UserImportResponseDto })
  @RequirePermissions('user:create')
  importUsers(@UploadedFile() file?: UploadFile) {
    return this.service.importUsers(file);
  }
}
