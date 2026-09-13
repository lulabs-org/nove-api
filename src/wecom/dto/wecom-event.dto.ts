import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WecomEventQueryDto {
  @IsString()
  @IsNotEmpty()
  msg_signature: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  nonce: string;

  @IsString()
  @IsOptional()
  echostr?: string; // 仅在验证 URL 时存在
}

export class WecomEventBodyDto {
  @IsString()
  @IsOptional()
  ToUserName?: string;

  @IsString()
  @IsOptional()
  AgentID?: string;

  @IsString()
  @IsNotEmpty()
  Encrypt: string;
}
