import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrgIntegrationDto {
  @ApiProperty({ description: '平台标识，例如 LARK, TENCENT_MEETING, WECHAT_SHOP' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ description: 'JSON 配置内容' })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
