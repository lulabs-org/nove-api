import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    description: '部门名称',
    example: '技术部',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '部门编码',
    example: 'TECH',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: '部门描述',
    example: '负责技术研发工作',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '父部门 ID',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: '部门层级',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: '负责人用户 ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  leaderUserId?: string;
}
