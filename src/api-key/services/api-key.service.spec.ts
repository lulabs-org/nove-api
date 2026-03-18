import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { apiKeyConfig } from '@/configs/api-key.config';
import { ApiKeyStatus } from '@prisma/client';
import { CreateApiKeyDto, UpdateApiKeyDto } from '../dto';
import { computeKeyHash } from '../utils/crypto.util';
import { PermissionService } from '@/permission/services/permission.service';

/* eslint-disable @typescript-eslint/unbound-method */

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let repository: jest.Mocked<ApiKeyRepository>;
  let permissionService: jest.Mocked<PermissionService>;

  const mockConfig = {
    environment: 'prod',
    secret: 'test-secret-key-for-testing',
  };

  const validRawKey = 'sk_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz';
  const validKeyHash = computeKeyHash(validRawKey, mockConfig.secret);

  const mockApiKey = {
    id: 'key-123',
    name: 'Test API Key',
    prefix: 'AbCdEfGhIj',
    last4: 'Xy12',
    status: ApiKeyStatus.ACTIVE,
    scopes: ['meetings:read', 'meetings:write'],
    expiresAt: new Date('2026-12-31T23:59:59Z'),
    createdAt: new Date('2026-01-05T00:00:00Z'),
    updatedAt: new Date('2026-01-05T00:00:00Z'),
    lastUsedAt: null,
    revokedAt: null,
    rotatedFromId: null,
    orgId: 'org-123',
    createdBy: 'user-123',
    keyHash: validKeyHash,
  };

  const mockApiKeyRepository = {
    create: jest.fn(),
    findByPrefix: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    revoke: jest.fn(),
    updateLastUsedAt: jest.fn().mockImplementation(() => {
      return Promise.resolve();
    }),
  };

  const mockPermissionService = {
    getPermissionsByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: ApiKeyRepository,
          useValue: mockApiKeyRepository,
        },
        {
          provide: apiKeyConfig.KEY,
          useValue: mockConfig,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    repository = module.get(ApiKeyRepository);
    permissionService = module.get(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createKey', () => {
    it('should create an API key successfully', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test API Key',
        scopes: ['meetings:read'],
        expiresAt: '2026-12-31T23:59:59Z',
      };

      permissionService.getPermissionsByUserId.mockResolvedValue([
        'meetings:read',
      ]);
      repository.create.mockResolvedValue(mockApiKey);

      const result = await service.createKey('org-123', 'user-123', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          scopes: dto.scopes,
          status: ApiKeyStatus.ACTIVE,
        }),
      );
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('id', mockApiKey.id);
      expect(result).toHaveProperty('name', dto.name);
    });

    it('should create an API key without optional fields', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test API Key',
      };

      repository.create.mockResolvedValue(mockApiKey);

      const result = await service.createKey('org-123', 'user-123', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          scopes: [],
          expiresAt: null,
        }),
      );
      expect(result).toHaveProperty('key');
    });

    it('should create an API key without userId', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test API Key',
      };

      repository.create.mockResolvedValue(mockApiKey);

      await service.createKey('org-123', '', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByUser: undefined,
        }),
      );
    });

    it('should throw BadRequestException when expiresAt is in the past', async () => {
      const dto: CreateApiKeyDto = {
        name: 'Test API Key',
        expiresAt: '2020-01-01T00:00:00Z',
      };

      await expect(
        service.createKey('org-123', 'user-123', dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createKey('org-123', 'user-123', dto),
      ).rejects.toThrow('Expiration date must be in the future');
    });
  });

  describe('listKeys', () => {
    it('should list API keys with default pagination', async () => {
      const mockItems = [mockApiKey];
      repository.findMany.mockResolvedValue({ items: mockItems, total: 1 });

      const result = await service.listKeys('org-123');

      expect(repository.findMany).toHaveBeenCalledWith('org-123', {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should list API keys with custom pagination', async () => {
      const mockItems = [mockApiKey];
      repository.findMany.mockResolvedValue({ items: mockItems, total: 25 });

      const result = await service.listKeys('org-123', {
        page: 2,
        pageSize: 5,
      });

      expect(repository.findMany).toHaveBeenCalledWith('org-123', {
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(5);
    });

    it('should return empty list when no keys exist', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      const result = await service.listKeys('org-123');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('updateKey', () => {
    it('should update an API key successfully', async () => {
      const dto: UpdateApiKeyDto = {
        name: 'Updated Name',
        scopes: ['meetings:write'],
      };

      const updatedKey = {
        ...mockApiKey,
        name: dto.name!,
        scopes: dto.scopes!,
      };
      permissionService.getPermissionsByUserId.mockResolvedValue([
        'meetings:write',
      ]);
      repository.findById.mockResolvedValue(mockApiKey);
      repository.update.mockResolvedValue(updatedKey);

      const result = await service.updateKey(
        'org-123',
        'key-123',
        dto,
        'user-123',
      );

      expect(repository.findById).toHaveBeenCalledWith('key-123', 'org-123');
      expect(repository.update).toHaveBeenCalledWith('key-123', 'org-123', {
        name: dto.name,
        scopes: dto.scopes,
        expiresAt: undefined,
      });
      expect(result.name).toBe(dto.name);
      expect(result.scopes).toEqual(dto.scopes);
    });

    it('should throw NotFoundException when key does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateKey(
          'org-123',
          'key-123',
          { name: 'Updated' },
          'user-123',
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateKey(
          'org-123',
          'key-123',
          { name: 'Updated' },
          'user-123',
        ),
      ).rejects.toThrow('API Key not found');
    });

    it('should throw BadRequestException when expiresAt is in the past', async () => {
      const dto: UpdateApiKeyDto = {
        name: 'Updated',
        expiresAt: '2020-01-01T00:00:00Z',
      };

      repository.findById.mockResolvedValue(mockApiKey);

      await expect(
        service.updateKey('org-123', 'key-123', dto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeKey', () => {
    it('should revoke an API key successfully', async () => {
      repository.findById.mockResolvedValue(mockApiKey);
      repository.revoke.mockResolvedValue(mockApiKey);

      await service.revokeKey('org-123', 'key-123', 'user-123');

      expect(repository.findById).toHaveBeenCalledWith('key-123', 'org-123');
      expect(repository.revoke).toHaveBeenCalledWith('key-123', 'org-123');
    });

    it('should throw NotFoundException when key does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.revokeKey('org-123', 'key-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rotateKey', () => {
    it('should rotate an API key successfully', async () => {
      const oldKey = { ...mockApiKey };
      const newKey = {
        ...mockApiKey,
        id: 'new-key-123',
        prefix: 'NewPrefix',
        last4: 'Ab12',
      };

      repository.findById.mockResolvedValue(oldKey);
      repository.create.mockResolvedValue(newKey);
      repository.revoke.mockResolvedValue(oldKey);

      const result = await service.rotateKey('org-123', 'key-123', 'user-123');

      expect(repository.findById).toHaveBeenCalledWith('key-123', 'org-123');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: oldKey.name,
          scopes: oldKey.scopes,
          expiresAt: oldKey.expiresAt,
          status: ApiKeyStatus.ACTIVE,
        }),
      );
      expect(repository.revoke).toHaveBeenCalledWith('key-123', 'org-123');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('oldKeyId', oldKey.id);
    });

    it('should throw NotFoundException when key does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.rotateKey('org-123', 'key-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should preserve createdBy user when rotating', async () => {
      const oldKey = { ...mockApiKey, createdBy: 'user-123' };
      const newKey = { ...mockApiKey, id: 'new-key-123' };

      repository.findById.mockResolvedValue(oldKey);
      repository.create.mockResolvedValue(newKey);
      repository.revoke.mockResolvedValue(oldKey);

      await service.rotateKey('org-123', 'key-123', 'user-123');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByUser: { connect: { id: 'user-123' } },
        }),
      );
    });
  });

  describe('verifyKey', () => {
    const invalidFormatKey = 'invalid-key';

    it('should verify a valid API key successfully', async () => {
      repository.findByPrefix.mockResolvedValue(mockApiKey);

      const result = await service.verifyKey(validRawKey);

      expect(repository.findByPrefix).toHaveBeenCalledWith('AbCdEfGhIj');
      expect(repository.updateLastUsedAt).toHaveBeenCalledWith('key-123');
      expect(result).toEqual({
        orgId: 'org-123',
        apiKeyId: 'key-123',
        scopes: mockApiKey.scopes,
        userId: 'user-123',
      });
    });

    it('should throw UnauthorizedException for invalid key format', async () => {
      await expect(service.verifyKey(invalidFormatKey)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyKey(invalidFormatKey)).rejects.toThrow(
        'Invalid API key format',
      );
    });

    it('should throw UnauthorizedException when key not found', async () => {
      repository.findByPrefix.mockResolvedValue(null);

      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        'Invalid API key',
      );
    });

    it('should throw UnauthorizedException for inactive key', async () => {
      const inactiveKey = { ...mockApiKey, status: ApiKeyStatus.REVOKED };
      repository.findByPrefix.mockResolvedValue(inactiveKey);

      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        'API key is not active',
      );
    });

    it('should throw UnauthorizedException for expired key', async () => {
      const expiredKey = {
        ...mockApiKey,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      };
      repository.findByPrefix.mockResolvedValue(expiredKey);

      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyKey(validRawKey)).rejects.toThrow(
        'API key has expired',
      );
    });

    it('should accept key without expiration', async () => {
      const keyWithoutExpiration = { ...mockApiKey, expiresAt: null };
      repository.findByPrefix.mockResolvedValue(keyWithoutExpiration);

      const result = await service.verifyKey(validRawKey);

      expect(result).toHaveProperty('orgId', 'org-123');
    });
  });
});
