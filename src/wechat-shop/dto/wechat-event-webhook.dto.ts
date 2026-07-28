import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WechatEventQueryDto {
  @ApiPropertyOptional({ description: 'URL签名' })
  @IsString()
  @IsOptional()
  signature?: string;

  @ApiProperty({ description: '时间戳' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: '随机数' })
  @IsString()
  nonce: string;

  @ApiProperty({ description: '消息签名' })
  @IsString()
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

  @ApiPropertyOptional({ description: '加密的消息体' })
  @IsString()
  @IsOptional()
  Encrypt?: string;
}
