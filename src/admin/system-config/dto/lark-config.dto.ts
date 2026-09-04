import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLarkConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventEncryptKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventVerificationToken?: string;
}
