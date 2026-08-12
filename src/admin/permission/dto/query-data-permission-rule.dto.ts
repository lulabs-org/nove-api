import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryDataPermissionRuleDto {
  @ApiPropertyOptional({ description: '规则名称（模糊搜索）', example: '部门' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '规则编码', example: 'dept_only' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '资源标识', example: 'user' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
