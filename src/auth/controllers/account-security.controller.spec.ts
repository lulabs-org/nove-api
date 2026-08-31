import { AccountSecurityController } from './account-security.controller';
import { REQUIRE_AUTH_KEY } from '@/auth/decorators/require-auth.decorator';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AccountSecurityService } from '@/auth/services/account-security.service';

describe('AccountSecurityController', () => {
  it('restricts the complete controller to ordinary JWT authentication', () => {
    expect(
      Reflect.getMetadata(REQUIRE_AUTH_KEY, AccountSecurityController),
    ).toEqual(['jwt']);
  });

  it('delegates security state reads to the authenticated user only', async () => {
    const service = {
      getSecurity: jest.fn().mockResolvedValue({ hasPassword: true }),
    };
    const controller = new AccountSecurityController(service as never);

    await expect(
      controller.getSecurity({ id: 'user-1' } as never),
    ).resolves.toEqual({ hasPassword: true });
    expect(service.getSecurity).toHaveBeenCalledWith('user-1');
  });

  it('pre-validates identity proof before advancing a sensitive flow', async () => {
    const service = {
      verifyIdentity: jest.fn().mockResolvedValue({ verified: true }),
    };
    const controller = new AccountSecurityController(service as never);
    const dto = {
      verificationMethod: 'password',
      currentPassword: 'current-password',
    } as never;

    await expect(
      controller.verifyIdentity({ id: 'user-1' } as never, dto),
    ).resolves.toEqual({ verified: true });
    expect(service.verifyIdentity).toHaveBeenCalledWith('user-1', dto);
  });

  it('passes request context to email changes and clears an unpreserved session', async () => {
    const service = {
      changeEmail: jest.fn().mockResolvedValue({
        security: { email: 'new@example.com' },
        revokedSessionsCount: 2,
        currentSessionPreserved: false,
      }),
    };
    const controller = new AccountSecurityController(service as never);
    const clearCookie = jest.fn();
    const request = {
      ip: '127.0.0.1',
      headers: {},
      cookies: { refreshToken: 'refresh-token' },
      get: jest.fn().mockReturnValue('test-agent'),
    };
    const dto = { email: 'new@example.com' } as never;

    await controller.changeEmail(
      { id: 'user-1' } as never,
      dto,
      request as never,
      { clearCookie } as never,
    );

    expect(service.changeEmail).toHaveBeenCalledWith('user-1', dto, {
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      currentRefreshToken: 'refresh-token',
    });
    expect(clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });

  it('publishes the contact change response wrapper in OpenAPI', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountSecurityController],
      providers: [{ provide: AccountSecurityService, useValue: {} }],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Account security contract').build(),
    );

    expect(
      document.components?.schemas?.ContactChangeResponseDto,
    ).toMatchObject({
      required: ['security', 'revokedSessionsCount', 'currentSessionPreserved'],
      properties: {
        security: {
          $ref: '#/components/schemas/AccountSecurityResponseDto',
        },
        revokedSessionsCount: { minimum: 0, type: 'number' },
        currentSessionPreserved: { type: 'boolean' },
      },
    });
    expect(
      document.paths['/api/user/security/email']?.put?.responses?.['200'],
    ).toBeDefined();
    expect(
      document.paths['/api/user/security/phone']?.put?.responses?.['200'],
    ).toBeDefined();
    await app.close();
  });
});
