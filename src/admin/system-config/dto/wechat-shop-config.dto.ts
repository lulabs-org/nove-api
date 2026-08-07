import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWechatShopConfigDto {
  @ApiProperty({ description: 'Wechat Shop App ID', example: 'wx1234567890abcdef' })
  @IsString()
  @IsNotEmpty()
  appId: string;

  @ApiProperty({ description: 'Wechat Shop App Secret (will be encrypted)' })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiProperty({ description: 'Webhook Token (will be encrypted)' })
  @IsString()
  @IsOptional()
  webhookToken?: string;

  @ApiProperty({ description: 'Encoding AES Key (will be encrypted)' })
  @IsString()
  @IsOptional()
  encodingAesKey?: string;

  @ApiProperty({ description: 'API Base URL', example: 'https://api.weixin.qq.com' })
  @IsString()
  @IsOptional()
  apiBaseUrl?: string;
}
