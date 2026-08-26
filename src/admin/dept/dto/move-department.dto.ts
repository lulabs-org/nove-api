import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class MoveDepartmentDto {
  @ApiProperty({
    description: '新的父部门 ID（null 表示移动到根部门）',
    example: 'clx0987654321fedcba',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiProperty({
    description: '新的排序值',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
