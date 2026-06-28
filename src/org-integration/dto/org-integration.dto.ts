import { ApiProperty } from '@nestjs/swagger';

export class OrgIntegrationDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '组织ID' })
  orgId: string;

  @ApiProperty({ description: '平台标识' })
  platform: string;

  @ApiProperty({ description: '配置数据' })
  config: any;

  @ApiProperty({ description: '是否启用' })
  active: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
