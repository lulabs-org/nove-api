import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorizeDto {
  @ApiProperty({ description: '客户端 ID' })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({ description: '授权类型，固定为 code' })
  @IsString()
  @IsNotEmpty()
  response_type: string;

  @ApiProperty({ description: '重定向 URI' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  redirect_uri: string;

  @ApiPropertyOptional({ description: '请求的作用域，空格分隔' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ description: '状态参数，原样返回' })
  @IsString()
  @IsOptional()
  state?: string;
}

export class TokenDto {
  @ApiProperty({ description: '授权模式: authorization_code 或 refresh_token' })
  @IsString()
  @IsNotEmpty()
  grant_type: 'authorization_code' | 'refresh_token';

  @ApiPropertyOptional({ description: '授权码 (grant_type=authorization_code 时必填)' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '刷新令牌 (grant_type=refresh_token 时必填)' })
  @IsString()
  @IsOptional()
  refresh_token?: string;

  @ApiProperty({ description: '客户端 ID' })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({ description: '客户端秘钥' })
  @IsString()
  @IsNotEmpty()
  client_secret: string;

  @ApiPropertyOptional({ description: '重定向 URI (需与获取 code 时一致)' })
  @IsString()
  @IsOptional()
  redirect_uri?: string;
}

export class CreateClientDto {
  @ApiProperty({ description: '客户端名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '客户端描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '客户端 Logo' })
  @IsUrl()
  @IsOptional()
  logoUri?: string;

  @ApiProperty({ description: '允许的重定向 URI 列表', type: [String] })
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  redirectUris: string[];

  @ApiPropertyOptional({ description: '允许的作用域列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}
