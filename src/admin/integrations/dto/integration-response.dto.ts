import { ApiProperty } from '@nestjs/swagger';
import { ConfigSource, IntegrationModuleName } from '../types';

export class IntegrationSummaryResponseDto {
  @ApiProperty({ description: '组织 ID', example: 'org-1' })
  orgId!: string;

  @ApiProperty({
    description: '集成模块标识',
    example: 'mail',
    enum: ['mail', 'ai', 'tencent-meeting', 'lark', 'wechat-shop', 'drive'],
  })
  module!: IntegrationModuleName;

  @ApiProperty({ description: '是否已配置必填参数', example: true })
  configured!: boolean;

  @ApiProperty({
    description: '当前配置来源',
    example: 'database',
    enum: ['database', 'default'],
  })
  source!: ConfigSource;

  @ApiProperty({
    description: '最后更新时间',
    example: '2026-09-08T12:00:00.000Z',
    nullable: true,
  })
  updatedAt!: Date | null;
}

export class IntegrationDetailResponseDto extends IntegrationSummaryResponseDto {
  @ApiProperty({
    description: '掩码后的配置项键值对',
    example: { host: 'smtp.example.com', pass: '********' },
  })
  value!: Record<string, unknown>;
}

export class IntegrationMutationResponseDto {
  @ApiProperty({ description: '组织 ID', example: 'org-1' })
  orgId!: string;

  @ApiProperty({ description: '操作是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '操作结果说明', example: '配置已保存并生效' })
  message!: string;

  @ApiProperty({
    description: '是否需要重启 API 进程才能生效',
    example: false,
  })
  restartRequired!: boolean;
}

export class TestIntegrationResponseDto {
  @ApiProperty({ description: '组织 ID', example: 'org-1' })
  orgId!: string;

  @ApiProperty({ description: '测试是否成功', example: true })
  success!: boolean;

  @ApiProperty({ description: '测试结果说明', example: '连接测试成功' })
  message!: string;
}
