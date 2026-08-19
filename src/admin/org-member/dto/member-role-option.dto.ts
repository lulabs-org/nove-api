import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

const blankStringToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class QueryMemberRoleOptionDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: '姓名或邮箱关键字' })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '角色 ID' })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ enum: ['assigned', 'unassigned'] })
  @Transform(blankStringToUndefined)
  @IsOptional()
  @IsIn(['assigned', 'unassigned'])
  assignment?: 'assigned' | 'unassigned';
}

export class MemberRoleOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ type: String, nullable: true }) displayName:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) email: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) avatar: string | null;
  @ApiProperty({ type: [String] }) departmentNames: string[];
  @ApiProperty({ type: [String] }) roleIds: string[];
}

export class MemberRoleOptionListResponse {
  @ApiProperty({ type: [MemberRoleOptionDto] }) items: MemberRoleOptionDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}
