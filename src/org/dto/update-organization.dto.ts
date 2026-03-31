import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

/**
 * 更新组织 DTO
 */
export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: '组织名称',
    example: 'Acme Corporation Updated',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '组织编码',
    example: 'ACME_UPDATED',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: '组织 Logo URL',
    example: 'https://example.com/logo-updated.png',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({
    description: '组织描述',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '父组织 ID',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: '组织层级',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: '排序',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '是否启用',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
