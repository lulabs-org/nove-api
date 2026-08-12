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
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  CreateProductDto,
  ProductDto,
  ProductListResponseDto,
  QueryProductDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from '../dto';
import { ProductService } from '../services/product.service';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@Controller('admin/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('product:create')
  @ApiOperation({ summary: '创建产品' })
  @ApiResponse({ status: 201, type: ProductDto })
  create(
    @Body() dto: CreateProductDto,
    @Auth('userId') userId?: string,
  ): Promise<ProductDto> {
    return this.productService.create(dto, userId);
  }

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '获取产品列表' })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  findAll(@Query() query: QueryProductDto): Promise<ProductListResponseDto> {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('product:read')
  @ApiOperation({ summary: '获取产品详情' })
  @ApiParam({ name: 'id', description: '产品 ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  findById(@Param('id') id: string): Promise<ProductDto> {
    return this.productService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('product:update')
  @ApiOperation({ summary: '更新产品' })
  @ApiResponse({ status: 200, type: ProductDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Auth('userId') userId?: string,
  ): Promise<ProductDto> {
    return this.productService.update(id, dto, userId);
  }

  @Patch(':id/status')
  @RequirePermissions('product:toggle-status')
  @ApiOperation({ summary: '更新产品状态' })
  @ApiResponse({ status: 200, type: ProductDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
    @Auth('userId') userId?: string,
  ): Promise<ProductDto> {
    return this.productService.updateStatus(id, dto.status, userId);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除产品' })
  @ApiResponse({ status: 204, description: '产品删除成功' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.productService.delete(id);
  }
}
