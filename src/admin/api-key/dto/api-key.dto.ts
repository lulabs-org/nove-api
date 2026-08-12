import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyStatus } from '@prisma/client';

/**
 * API Key 响应 DTO
 */
export class ApiKeyDto {
  @ApiProperty({
    description: 'API Key ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'API Key 名称',
    example: 'Production API Key',
  })
  name: string;

  @ApiProperty({
    description: 'Key 前缀（用于识别）',
    example: 'AbCdEfGhIj',
  })
  prefix: string;

  @ApiProperty({
    description: 'Key 最后 4 位',
    example: 'Xy12',
  })
  last4: string;

  @ApiProperty({
    description: 'Key 状态',
    enum: ApiKeyStatus,
    example: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @ApiProperty({
    description: '权限范围',
    type: [String],
    example: ['meetings:read', 'meetings:write'],
  })
  scopes: string[];

  @ApiPropertyOptional({
    description: '过期时间',
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    description: '创建时间',
    example: '2026-01-05T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: '最后使用时间',
    example: '2026-01-05T12:30:00.000Z',
    nullable: true,
  })
  lastUsedAt: Date | null;
}

/**
 * 创建 API Key 响应 DTO（包含明文 key，仅返回一次）
 */
export class CreateApiKeyResponse extends ApiKeyDto {
  @ApiProperty({
    description: '完整的 API Key（仅在创建时返回一次）',
    example: 'sk_prod_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz',
  })
  key: string;
}

/**
 * 轮换 API Key 响应 DTO
 */
export class RotateApiKeyResponse extends ApiKeyDto {
  @ApiProperty({
    description: '新的完整 API Key（仅在轮换时返回一次）',
    example: 'sk_prod_KlMnOpQrSt.abcdefghijklmnopqrstuvwxyz1234567890',
  })
  key: string;

  @ApiProperty({
    description: '旧 Key 的 ID',
    example: 'clx0987654321fedcba',
  })
  oldKeyId: string;
}

/**
 * API Key 列表响应 DTO
 */
export class ApiKeyListResponse {
  @ApiProperty({
    description: 'API Key 列表',
    type: [ApiKeyDto],
  })
  items: ApiKeyDto[];

  @ApiProperty({
    description: '总数',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages: number;
}
