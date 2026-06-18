import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnifiedAuthGuard } from './unified-auth.guard';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import { UserOrgService } from '@/api-key/services/user-organization.service';
import { PermService } from '@/permission/services/permission.service';
import { REQUIRE_AUTH_KEY } from './require-auth.decorator';

/* eslint-disable @typescript-eslint/unbound-method */

describe('UnifiedAuthGuard', () => {
  let guard: UnifiedAuthGuard;
  let apiKeyService: jest.Mocked<ApiKeyService>;

  const mockApiKeyService = {
    verifyKey: jest.fn(),
  };

  const mockUserOrgService = {
    getPrimaryOrgId: jest.fn(),
  };

  const mockPermService = {
    getPermByRoleCodes: jest.fn(),
  };

  interface ReflectorOverrides {
    isPublic?: boolean;
    requireAuth?: string[] | null;
  }

  /**
   * 创建 reflector mock，根据 metadata key 返回对应值
   */
  const createReflector = (overrides: ReflectorOverrides = {}) => ({
    getAllAndOverride: jest.fn().mockImplementation((key: string) => {
      if (key === 'isPublic') return overrides.isPublic ?? false;
      if (key === REQUIRE_AUTH_KEY) return overrides.requireAuth ?? null;
      return undefined;
    }),
  });

  interface MockRequest {
    headers: Record<string, string>;
    authContext?: Record<string, unknown>;
    apiAuth?: Record<string, unknown>;
    user?: Record<string, unknown>;
  }

  const createMockContext = (
    headers: Record<string, string> = {},
  ): {
    context: ExecutionContext;
    request: MockRequest;
  } => {
    const request: MockRequest = {
      headers: {
        ...headers,
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  const buildGuard = async (reflectorOverrides: ReflectorOverrides = {}) => {
    const mockReflector = createReflector(reflectorOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedAuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ApiKeyService, useValue: mockApiKeyService },
        { provide: UserOrgService, useValue: mockUserOrgService },
        { provide: PermService, useValue: mockPermService },
      ],
    }).compile();

    guard = module.get<UnifiedAuthGuard>(UnifiedAuthGuard);
    apiKeyService = module.get(ApiKeyService);
    return guard;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Public routes', () => {
    it('should allow access to @Public() routes without any auth', async () => {
      await buildGuard({ isPublic: true });

      const { context } = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('API Key authentication', () => {
    it('should authenticate via x-api-key header', async () => {
      await buildGuard();

      const mockApiAuth = {
        orgId: 'org-123',
        apiKeyId: 'key-123',
        scopes: ['meetings:read'],
        userId: 'user-123',
      };
      apiKeyService.verifyKey.mockResolvedValue(mockApiAuth);

      const { context, request } = createMockContext({
        'x-api-key': 'sk_test.secret123',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.authContext).toEqual({
        authMethod: 'api_key',
        userId: 'user-123',
        orgId: 'org-123',
        permissions: ['meetings:read'],
        apiKeyId: 'key-123',
      });
      expect(request.apiAuth).toEqual(mockApiAuth);
    });

    it('should authenticate via Bearer sk_* token', async () => {
      await buildGuard();

      const mockApiAuth = {
        orgId: 'org-456',
        apiKeyId: 'key-456',
        scopes: ['meetings:write'],
        userId: null,
      };
      apiKeyService.verifyKey.mockResolvedValue(mockApiAuth);

      const { context, request } = createMockContext({
        authorization: 'Bearer sk_prefix.secretkey',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.authContext).toEqual({
        authMethod: 'api_key',
        userId: null,
        orgId: 'org-456',
        permissions: ['meetings:write'],
        apiKeyId: 'key-456',
      });
    });

    it('should reject API Key when @RequireAuth("jwt") is set', async () => {
      await buildGuard({ requireAuth: ['jwt'] });

      const { context } = createMockContext({
        'x-api-key': 'sk_test.secret123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException for invalid API Key', async () => {
      await buildGuard();

      apiKeyService.verifyKey.mockRejectedValue(
        new UnauthorizedException('Invalid API key'),
      );

      const { context } = createMockContext({
        'x-api-key': 'sk_invalid.badkey',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should set request.user with creator id for API Key auth', async () => {
      await buildGuard();

      const mockApiAuth = {
        orgId: 'org-123',
        apiKeyId: 'key-123',
        scopes: [],
        userId: 'creator-user-id',
      };
      apiKeyService.verifyKey.mockResolvedValue(mockApiAuth);

      const { context, request } = createMockContext({
        'x-api-key': 'sk_test.secret123',
      });

      await guard.canActivate(context);

      expect(request.user).toEqual({
        id: 'creator-user-id',
        authType: 'api_key',
      });
    });
  });

  describe('RequireAuth decorator', () => {
    it('should allow API Key when @RequireAuth("api_key") is set', async () => {
      await buildGuard({ requireAuth: ['api_key'] });

      const mockApiAuth = {
        orgId: 'org-123',
        apiKeyId: 'key-123',
        scopes: [],
        userId: 'user-123',
      };
      apiKeyService.verifyKey.mockResolvedValue(mockApiAuth);

      const { context } = createMockContext({
        'x-api-key': 'sk_test.secret123',
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject JWT when @RequireAuth("api_key") is set', async () => {
      await buildGuard({ requireAuth: ['api_key'] });

      const { context } = createMockContext({
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('extractApiKey', () => {
    it('should prefer x-api-key header over Authorization', async () => {
      await buildGuard();

      const mockApiAuth = {
        orgId: 'org-123',
        apiKeyId: 'key-123',
        scopes: [],
        userId: null,
      };
      apiKeyService.verifyKey.mockResolvedValue(mockApiAuth);

      const { context } = createMockContext({
        'x-api-key': 'sk_from_header.secret',
        authorization: 'Bearer sk_from_auth.secret',
      });

      await guard.canActivate(context);

      expect(apiKeyService.verifyKey).toHaveBeenCalledWith(
        'sk_from_header.secret',
      );
    });

    it('should not treat non-sk_ Bearer tokens as API keys', async () => {
      await buildGuard();

      const { context } = createMockContext({
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test.sig',
      });

      // In unit test, JWT strategy is not wired up, so canActivate
      // delegates to super (Passport AuthGuard). The key assertion is
      // that apiKeyService.verifyKey was NOT called.
      try {
        await guard.canActivate(context);
      } catch {
        // expected — no real JWT strategy in unit test
      }

      expect(apiKeyService.verifyKey).not.toHaveBeenCalled();
    });
  });
});
