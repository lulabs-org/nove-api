import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * 创建 API Key DTO
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API Key 名称',
    example: 'Production API Key',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '权限范围数组',
    example: ['meetings:read', 'meetings:write'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    description: '过期时间 (ISO 8601 格式)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
