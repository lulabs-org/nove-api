import { ApiProperty } from '@nestjs/swagger';

export class OrganizationStatsDto {
  @ApiProperty({
    description: '总人数',
    example: 150,
  })
  totalUsers: number;

  @ApiProperty({
    description: '部门数',
    example: 10,
  })
  totalDepartments: number;

  @ApiProperty({
    description: '禁用人数',
    example: 5,
  })
  disabledUsers: number;

  @ApiProperty({
    description: '活跃人数',
    example: 145,
  })
  activeUsers: number;

  @ApiProperty({
    description: '管理员人数',
    example: 3,
  })
  adminUsers: number;

  @ApiProperty({
    description: 'API Key 数量',
    example: 25,
  })
  totalApiKeys: number;

  @ApiProperty({
    description: '活跃 API Key 数量',
    example: 20,
  })
  activeApiKeys: number;
}
