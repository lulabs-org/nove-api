import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DataPermissionRuleDto {
  @ApiProperty({ description: '规则ID' })
  id: string;

  @ApiProperty({ description: '规则名称' })
  name: string;

  @ApiProperty({ description: '规则编码' })
  code: string;

  @ApiPropertyOptional({ description: '规则描述', nullable: true })
  description: string | null;

  @ApiProperty({ description: '资源标识' })
  resource: string;

  @ApiProperty({ description: '权限条件（JSON格式）' })
  condition: string;

  @ApiProperty({ description: '是否启用' })
  active: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class DataPermissionRuleListResponse {
  @ApiProperty({
    description: '数据权限规则列表',
    type: [DataPermissionRuleDto],
  })
  items: DataPermissionRuleDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
