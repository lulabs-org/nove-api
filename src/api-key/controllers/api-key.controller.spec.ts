import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from '../services/api-key.service';
import { UserOrganizationService } from '../services/user-organization.service';
import { ApiKeyStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let apiKeyService: ApiKeyService;
  let userOrgService: UserOrganizationService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    active: true,
    emailVerified: true,
    phoneVerified: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockOrganizationId = 'org-123';

  const mockApiKeyDto = {
    id: 'key-123',
    name: 'Test API Key',
    prefix: 'AbCdEfGhIj',
    last4: 'Xy12',
    status: ApiKeyStatus.ACTIVE,
    scopes: ['meetings:read', 'meetings:write'],
    expiresAt: new Date('2026-12-31T23:59:59Z'),
    createdAt: new Date('2026-01-05T00:00:00Z'),
    lastUsedAt: null,
  };

  const mockCreateApiKeyResponse = {
    ...mockApiKeyDto,
    key: 'sk_prod_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz',
  };

  const mockApiKeyListResponse = {
    items: [mockApiKeyDto],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  const mockRotateApiKeyResponse = {
    ...mockApiKeyDto,
    id: 'key-456',
    key: 'sk_prod_KlMnOpQrSt.abcdefghijklmnopqrstuvwxyz1234567890',
    oldKeyId: 'key-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useValue: {
            createKey: jest.fn(),
            listKeys: jest.fn(),
            updateKey: jest.fn(),
            revokeKey: jest.fn(),
            rotateKey: jest.fn(),
          },
        },
        {
          provide: UserOrganizationService,
          useValue: {
            getPrimaryOrganizationId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    userOrgService = module.get<UserOrganizationService>(
      UserOrganizationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createKey', () => {
    it('should create a new API key', async () => {
      const createDto = {
        name: 'Test API Key',
        scopes: ['meetings:read', 'meetings:write'],
        expiresAt: '2026-12-31T23:59:59Z',
      };

      const getPrimaryOrganizationIdSpy = jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const createKeySpy = jest
        .spyOn(apiKeyService, 'createKey')
        .mockResolvedValue(mockCreateApiKeyResponse);

      const result = await controller.createKey(mockUser, createDto);

      expect(getPrimaryOrganizationIdSpy).toHaveBeenCalledWith(mockUser.id);
      expect(createKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUser.id,
        createDto,
      );
      expect(result).toEqual(mockCreateApiKeyResponse);
    });

    it('should create API key without optional fields', async () => {
      const createDto = {
        name: 'Simple API Key',
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const createKeySpy = jest
        .spyOn(apiKeyService, 'createKey')
        .mockResolvedValue(mockCreateApiKeyResponse);

      const result = await controller.createKey(mockUser, createDto);

      expect(createKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUser.id,
        createDto,
      );
      expect(result).toEqual(mockCreateApiKeyResponse);
    });

    it('should propagate errors from service', async () => {
      const createDto = {
        name: 'Test API Key',
        expiresAt: '2020-01-01T00:00:00Z',
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'createKey')
        .mockRejectedValue(
          new BadRequestException('Expiration date must be in the future'),
        );

      await expect(controller.createKey(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listKeys', () => {
    it('should list API keys with default pagination', async () => {
      const pagination = {};

      const getPrimaryOrganizationIdSpy = jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const listKeysSpy = jest
        .spyOn(apiKeyService, 'listKeys')
        .mockResolvedValue(mockApiKeyListResponse);

      const result = await controller.listKeys(mockUser, pagination);

      expect(getPrimaryOrganizationIdSpy).toHaveBeenCalledWith(mockUser.id);
      expect(listKeysSpy).toHaveBeenCalledWith(
        mockOrganizationId,
        pagination,
        mockUser.id,
      );
      expect(result).toEqual(mockApiKeyListResponse);
    });

    it('should list API keys with custom pagination', async () => {
      const pagination = {
        page: 2,
        pageSize: 20,
      };

      const customListResponse = {
        ...mockApiKeyListResponse,
        page: 2,
        pageSize: 20,
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const listKeysSpy = jest
        .spyOn(apiKeyService, 'listKeys')
        .mockResolvedValue(customListResponse);

      const result = await controller.listKeys(mockUser, pagination);

      expect(listKeysSpy).toHaveBeenCalledWith(
        mockOrganizationId,
        pagination,
        mockUser.id,
      );
      expect(result).toEqual(customListResponse);
    });

    it('should return empty list when no keys exist', async () => {
      const emptyListResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'listKeys')
        .mockResolvedValue(emptyListResponse);

      const result = await controller.listKeys(mockUser, {});

      expect(result).toEqual(emptyListResponse);
    });
  });

  describe('updateKey', () => {
    it('should update API key name', async () => {
      const updateDto = {
        name: 'Updated API Key Name',
      };

      const updatedKey = {
        ...mockApiKeyDto,
        name: 'Updated API Key Name',
      };

      const getPrimaryOrganizationIdSpy = jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const updateKeySpy = jest
        .spyOn(apiKeyService, 'updateKey')
        .mockResolvedValue(updatedKey);

      const result = await controller.updateKey(mockUser, 'key-123', updateDto);

      expect(getPrimaryOrganizationIdSpy).toHaveBeenCalledWith(mockUser.id);
      expect(updateKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        'key-123',
        updateDto,
        mockUser.id,
      );
      expect(result).toEqual(updatedKey);
    });

    it('should update API key scopes', async () => {
      const updateDto = {
        scopes: ['users:read', 'users:write'],
      };

      const updatedKey = {
        ...mockApiKeyDto,
        scopes: ['users:read', 'users:write'],
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const updateKeySpy = jest
        .spyOn(apiKeyService, 'updateKey')
        .mockResolvedValue(updatedKey);

      const result = await controller.updateKey(mockUser, 'key-123', updateDto);

      expect(updateKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        'key-123',
        updateDto,
        mockUser.id,
      );
      expect(result).toEqual(updatedKey);
    });

    it('should update API key expiration date', async () => {
      const updateDto = {
        expiresAt: '2027-12-31T23:59:59Z',
      };

      const updatedKey = {
        ...mockApiKeyDto,
        expiresAt: new Date('2027-12-31T23:59:59Z'),
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const updateKeySpy = jest
        .spyOn(apiKeyService, 'updateKey')
        .mockResolvedValue(updatedKey);

      const result = await controller.updateKey(mockUser, 'key-123', updateDto);

      expect(updateKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        'key-123',
        updateDto,
        mockUser.id,
      );
      expect(result).toEqual(updatedKey);
    });

    it('should throw NotFoundException when key does not exist', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'updateKey')
        .mockRejectedValue(new NotFoundException('API Key not found'));

      await expect(
        controller.updateKey(mockUser, 'non-existent-key', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid expiration date', async () => {
      const updateDto = {
        expiresAt: '2020-01-01T00:00:00Z',
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'updateKey')
        .mockRejectedValue(
          new BadRequestException('Expiration date must be in the future'),
        );

      await expect(
        controller.updateKey(mockUser, 'key-123', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeKey', () => {
    it('should revoke API key successfully', async () => {
      const getPrimaryOrganizationIdSpy = jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const revokeKeySpy = jest
        .spyOn(apiKeyService, 'revokeKey')
        .mockResolvedValue(undefined);

      await controller.revokeKey(mockUser, 'key-123');

      expect(getPrimaryOrganizationIdSpy).toHaveBeenCalledWith(mockUser.id);
      expect(revokeKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        'key-123',
        mockUser.id,
      );
    });

    it('should throw NotFoundException when key does not exist', async () => {
      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'revokeKey')
        .mockRejectedValue(new NotFoundException('API Key not found'));

      await expect(
        controller.revokeKey(mockUser, 'non-existent-key'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rotateKey', () => {
    it('should rotate API key successfully', async () => {
      const getPrimaryOrganizationIdSpy = jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      const rotateKeySpy = jest
        .spyOn(apiKeyService, 'rotateKey')
        .mockResolvedValue(mockRotateApiKeyResponse);

      const result = await controller.rotateKey(mockUser, 'key-123');

      expect(getPrimaryOrganizationIdSpy).toHaveBeenCalledWith(mockUser.id);
      expect(rotateKeySpy).toHaveBeenCalledWith(
        mockOrganizationId,
        'key-123',
        mockUser.id,
      );
      expect(result).toEqual(mockRotateApiKeyResponse);
      expect(result.key).toBeDefined();
      expect(result.oldKeyId).toBe('key-123');
    });

    it('should throw NotFoundException when key does not exist', async () => {
      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest
        .spyOn(apiKeyService, 'rotateKey')
        .mockRejectedValue(new NotFoundException('API Key not found'));

      await expect(
        controller.rotateKey(mockUser, 'non-existent-key'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return new key with preserved properties', async () => {
      const rotateResponse = {
        ...mockApiKeyDto,
        id: 'key-789',
        key: 'sk_prod_NewKey.NewKeyHashValue',
        oldKeyId: 'key-123',
      };

      jest
        .spyOn(userOrgService, 'getPrimaryOrganizationId')
        .mockResolvedValue(mockOrganizationId);
      jest.spyOn(apiKeyService, 'rotateKey').mockResolvedValue(rotateResponse);

      const result = await controller.rotateKey(mockUser, 'key-123');

      expect(result.name).toBe(mockApiKeyDto.name);
      expect(result.scopes).toEqual(mockApiKeyDto.scopes);
      expect(result.key).toBeDefined();
      expect(result.oldKeyId).toBe('key-123');
    });
  });
});
