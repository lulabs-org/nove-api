import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class WechatEventQueryDto {
  @ApiPropertyOptional({ description: 'URL签名' })
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiProperty({ description: '时间戳' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ description: '随机数' })
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @ApiProperty({ description: '消息签名' })
  @IsString()
  @IsNotEmpty()
  msg_signature: string;

  @ApiPropertyOptional({ description: '加密类型' })
  @IsString()
  @IsOptional()
  encrypt_type?: string;

  @ApiPropertyOptional({ description: '微信用户 OpenID' })
  @IsString()
  @IsOptional()
  openid?: string;

  @ApiPropertyOptional({ description: '事件唯一ID' })
  @IsString()
  @IsOptional()
  event_uid?: string;
}

export class WechatEventBodyDto {
  @ApiPropertyOptional({ description: '接收方原始 ID' })
  @IsString()
  @IsOptional()
  ToUserName?: string;

  @ApiProperty({ description: '加密的消息体' })
  @IsString()
  @IsNotEmpty()
  Encrypt: string;
}
