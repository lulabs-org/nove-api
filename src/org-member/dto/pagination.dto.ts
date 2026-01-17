import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { MemberType, MemberStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '搜索关键字（姓名、工号、邮箱）',
    example: '张三',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '部门 ID 筛选',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiPropertyOptional({
    description: '成员类型筛选',
    enum: MemberType,
    example: MemberType.INTERNAL,
  })
  @IsOptional()
  @IsEnum(MemberType)
  type?: MemberType;

  @ApiPropertyOptional({
    description: '成员状态筛选',
    enum: MemberStatus,
    example: MemberStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({
    description: '是否包含子部门成员',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;
}
