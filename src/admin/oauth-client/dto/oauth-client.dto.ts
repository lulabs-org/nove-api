import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OAuthClientStatus, OAuthClientType } from '@prisma/client';

export class QueryOAuthClientsDto {
  @ApiPropertyOptional({ default: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ enum: OAuthClientType })
  @IsEnum(OAuthClientType)
  @IsOptional()
  clientType?: OAuthClientType;

  @ApiPropertyOptional({ enum: OAuthClientStatus })
  @IsEnum(OAuthClientStatus)
  @IsOptional()
  status?: OAuthClientStatus;
}

export class CreateOAuthClientDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUri?: string;

  @ApiProperty({ enum: OAuthClientType })
  @IsEnum(OAuthClientType)
  clientType: OAuthClientType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  redirectUris: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];
}

export class UpdateOAuthClientDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  logoUri?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  redirectUris?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}

export class OAuthClientDto {
  @ApiProperty() id: string;
  @ApiProperty() clientId: string;
  @ApiProperty({ enum: OAuthClientType }) clientType: OAuthClientType;
  @ApiProperty({ enum: OAuthClientStatus }) status: OAuthClientStatus;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true, type: String }) logoUri: string | null;
  @ApiProperty({ type: [String] }) redirectUris: string[];
  @ApiProperty({ type: [String] }) grants: string[];
  @ApiProperty({ type: [String] }) scopes: string[];
  @ApiProperty() credentialVersion: number;
  @ApiPropertyOptional({ nullable: true, type: Date }) disabledAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OAuthClientListResponseDto {
  @ApiProperty({ type: [OAuthClientDto] }) items: OAuthClientDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class CreateOAuthClientResponseDto extends OAuthClientDto {
  @ApiPropertyOptional({
    description: 'Returned once for confidential clients',
  })
  clientSecret?: string;
}

export class RotateOAuthClientSecretResponseDto {
  @ApiProperty() clientSecret: string;
  @ApiProperty() rotatedAt: Date;
}

export class DelegatableScopeDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() resource: string;
  @ApiProperty() action: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description:
    | string
    | null;
}
