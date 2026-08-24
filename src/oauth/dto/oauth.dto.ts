import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorizeDto {
  @ApiProperty({ description: 'OAuth client ID' })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({ enum: ['code'] })
  @IsIn(['code'])
  response_type: 'code';

  @ApiProperty({ description: 'Registered redirect URI' })
  @IsUrl({ require_tld: false })
  redirect_uri: string;

  @ApiProperty({ description: 'Space-delimited requested permissions' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 4096)
  scope: string;

  @ApiProperty({ description: 'Client CSRF state' })
  @IsString()
  @IsNotEmpty()
  @Length(16, 512)
  state: string;

  @ApiProperty({ description: 'PKCE S256 challenge' })
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  code_challenge: string;

  @ApiProperty({ enum: ['S256'] })
  @IsIn(['S256'])
  code_challenge_method: 'S256';
}

export class AuthorizationDecisionDto {
  @ApiProperty({
    description: 'Permissions selected by the user',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];

  @ApiProperty({
    description: 'Organization in which the delegated grant applies',
  })
  @IsString()
  @IsNotEmpty()
  organization_id: string;
}

export class TokenDto {
  @ApiProperty({ enum: ['authorization_code', 'refresh_token'] })
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: 'authorization_code' | 'refresh_token';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refresh_token?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiPropertyOptional({ description: 'Confidential clients only' })
  @IsString()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @ApiPropertyOptional({
    description: 'PKCE verifier for authorization code exchange',
  })
  @IsString()
  @IsOptional()
  code_verifier?: string;
}

export class RevokeTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_id: string;
}

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  logoUri?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  redirectUris: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}
