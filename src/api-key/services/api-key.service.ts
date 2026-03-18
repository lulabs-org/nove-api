import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ApiKeyStatus } from '@prisma/client';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { apiKeyConfig } from '@/configs/api-key.config';
import {
  generateApiKey,
  parseApiKey,
  verifyKeyHash,
} from '../utils/crypto.util';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  PaginationDto,
  CreateApiKeyResponse,
  ApiKeyDto,
  ApiKeyListResponse,
  RotateApiKeyResponse,
} from '../dto';
import { ApiKeyAuthContext } from '../types';
import { PermService } from '@/permission/services/permission.service';

/**
 * API Key Service
 * Handle all API Key related business logic
 */
@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    @Inject(apiKeyConfig.KEY)
    private readonly config: ConfigType<typeof apiKeyConfig>,
    private readonly permService: PermService,
  ) {}

  /**
   * Create API Key
   * @param organizationId Organization ID
   * @param userId Creator user ID
   * @param dto Create DTO
   * @returns Response containing plain key (returned only once)
   */
  async createKey(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponse> {
    const requestedScopes = dto.scopes || [];

    if (requestedScopes.length > 0) {
      const userPermissions =
        await this.permService.getPermissionsByUserId(userId);

      const hasAllScopes = requestedScopes.every((scope) =>
        userPermissions.includes(scope),
      );

      if (!hasAllScopes) {
        const missingScopes = requestedScopes.filter(
          (scope) => !userPermissions.includes(scope),
        );
        throw new ForbiddenException(
          `Cannot create API key with scopes you don't have. Missing permissions: ${missingScopes.join(', ')}`,
        );
      }
    }

    if (dto.expiresAt) {
      const expiresAt = new Date(dto.expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const { rawKey, prefix, keyHash, last4 } = generateApiKey(
      this.config.secret,
    );

    const apiKey = await this.apiKeyRepository.create({
      org: {
        connect: { id: organizationId },
      },
      createdByUser: userId
        ? {
            connect: { id: userId },
          }
        : undefined,
      name: dto.name,
      prefix,
      keyHash,
      last4,
      scopes: requestedScopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      status: ApiKeyStatus.ACTIVE,
    });

    return {
      ...this.toDto(apiKey),
      key: rawKey,
    };
  }

  /**
   * List organization's API Keys
   * @param organizationId Organization ID
   * @param pagination Pagination parameters
   * @returns API Key list
   */
  async listKeys(
    organizationId: string,
    pagination?: PaginationDto,
    userId?: string,
  ): Promise<ApiKeyListResponse> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.apiKeyRepository.findMany(
      organizationId,
      {
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        createdBy: userId,
        status: pagination?.status,
      },
    );

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update API Key
   * @param organizationId Organization ID
   * @param keyId API Key ID
   * @param dto Update DTO
   * @returns Updated API Key
   */
  async updateKey(
    organizationId: string,
    keyId: string,
    dto: UpdateApiKeyDto,
    userId: string,
  ): Promise<ApiKeyDto> {
    const existingKey = await this.apiKeyRepository.findById(
      keyId,
      organizationId,
    );
    if (!existingKey) {
      throw new NotFoundException('API Key not found');
    }

    if (existingKey.createdBy !== userId) {
      throw new ForbiddenException('You can only update API keys you created');
    }

    if (dto.scopes && dto.scopes.length > 0) {
      const userPermissions =
        await this.permService.getPermissionsByUserId(userId);

      const hasAllScopes = dto.scopes.every((scope) =>
        userPermissions.includes(scope),
      );

      if (!hasAllScopes) {
        const missingScopes = dto.scopes.filter(
          (scope) => !userPermissions.includes(scope),
        );
        throw new ForbiddenException(
          `Cannot update API key with scopes you don't have. Missing permissions: ${missingScopes.join(', ')}`,
        );
      }
    }

    if (dto.expiresAt) {
      const expiresAt = new Date(dto.expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
    }

    const updatedKey = await this.apiKeyRepository.update(
      keyId,
      organizationId,
      {
        name: dto.name,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    );

    return this.toDto(updatedKey);
  }

  /**
   * Revoke API Key
   * @param organizationId Organization ID
   * @param keyId API Key ID
   */
  async revokeKey(
    organizationId: string,
    keyId: string,
    userId: string,
  ): Promise<void> {
    const existingKey = await this.apiKeyRepository.findById(
      keyId,
      organizationId,
    );
    if (!existingKey) {
      throw new NotFoundException('API Key not found');
    }

    if (existingKey.createdBy !== userId) {
      throw new ForbiddenException('You can only revoke API keys you created');
    }

    await this.apiKeyRepository.revoke(keyId, organizationId);
  }

  /**
   * Rotate API Key
   * @param organizationId Organization ID
   * @param keyId API Key ID
   * @returns Response containing new plain key (returned only once)
   */
  async rotateKey(
    organizationId: string,
    keyId: string,
    userId: string,
  ): Promise<RotateApiKeyResponse> {
    const oldKey = await this.apiKeyRepository.findById(keyId, organizationId);
    if (!oldKey) {
      throw new NotFoundException('API Key not found');
    }

    if (oldKey.createdBy !== userId) {
      throw new ForbiddenException('You can only rotate API keys you created');
    }

    const { rawKey, prefix, keyHash, last4 } = generateApiKey(
      this.config.secret,
    );

    const newKey = await this.apiKeyRepository.create({
      org: {
        connect: { id: organizationId },
      },
      createdByUser: oldKey.createdBy
        ? {
            connect: { id: oldKey.createdBy },
          }
        : undefined,
      name: oldKey.name,
      prefix,
      keyHash,
      last4,
      scopes: oldKey.scopes,
      expiresAt: oldKey.expiresAt,
      status: ApiKeyStatus.ACTIVE,
      rotatedFrom: {
        connect: { id: oldKey.id },
      },
    });

    await this.apiKeyRepository.revoke(keyId, organizationId);

    return {
      ...this.toDto(newKey),
      key: rawKey,
      oldKeyId: oldKey.id,
    };
  }

  /**
   * Verify API Key
   * @param rawKey Raw API Key
   * @returns Authentication context
   */
  async verifyKey(rawKey: string): Promise<ApiKeyAuthContext> {
    // 解析 key 格式
    const parsed = parseApiKey(rawKey);
    if (!parsed) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const { prefix } = parsed;

    // 根据 prefix 查找 key
    const apiKey = await this.apiKeyRepository.findByPrefix(prefix);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // 验证哈希
    const isValid = verifyKeyHash(rawKey, apiKey.keyHash, this.config.secret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // 验证状态
    if (apiKey.status !== ApiKeyStatus.ACTIVE) {
      throw new UnauthorizedException('API key is not active');
    }

    // 验证过期时间
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // 异步更新最后使用时间（不阻塞请求）
    void this.apiKeyRepository.updateLastUsedAt(apiKey.id);

    let validScopes: string[] = [];

    if (apiKey.createdBy) {
      try {
        const userPerm = await this.permService.getPermissionsByUserId(
          apiKey.createdBy,
        );

        validScopes = apiKey.scopes.filter((scope) => userPerm.includes(scope));
      } catch {
        validScopes = [];
      }
    } else {
      validScopes = apiKey.scopes;
    }

    return {
      orgId: apiKey.orgId,
      apiKeyId: apiKey.id,
      scopes: validScopes,
      userId: apiKey.createdBy,
    };
  }

  /**
   * Convert Prisma model to DTO
   * @param apiKey Prisma ApiKey model
   * @returns ApiKeyDto
   */
  private toDto(apiKey: {
    id: string;
    name: string;
    prefix: string;
    last4: string;
    status: ApiKeyStatus;
    scopes: string[];
    expiresAt: Date | null;
    createdAt: Date;
    lastUsedAt: Date | null;
  }): ApiKeyDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      last4: apiKey.last4,
      status: apiKey.status,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    };
  }
}
