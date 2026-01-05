import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';

/**
 * 更新 API Key DTO
 */
export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'API Key 名称',
    example: 'Updated API Key Name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '权限范围数组',
    example: ['meetings:read', 'users:read'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    description: '过期时间 (ISO 8601 格式)',
    example: '2027-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
