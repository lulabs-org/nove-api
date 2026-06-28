import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateOrgIntegrationDto } from './create-org-integration.dto';
import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateOrgIntegrationDto extends PartialType(CreateOrgIntegrationDto) {
  @ApiProperty({ description: 'JSON 配置内容' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
