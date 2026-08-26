import { Test } from '@nestjs/testing';

import { PERMISSIONS_KEY } from '@/admin/permission/decorators/permissions.decorator';
import { REQUIRE_AUTH_KEY } from '@/auth/decorators/require-auth.decorator';
import { OAuthClientAdminController } from './oauth-client-admin.controller';
import { OAuthClientAdminService } from './oauth-client-admin.service';

/* eslint-disable @typescript-eslint/unbound-method -- Metadata assertions intentionally inspect controller methods without invoking them. */

describe('OAuthClientAdminController', () => {
  it('requires normal JWT auth and dedicated operation permissions', async () => {
    const module = await Test.createTestingModule({
      controllers: [OAuthClientAdminController],
      providers: [{ provide: OAuthClientAdminService, useValue: {} }],
    }).compile();
    const controller = module.get(OAuthClientAdminController);

    expect(
      Reflect.getMetadata(REQUIRE_AUTH_KEY, OAuthClientAdminController),
    ).toEqual(['jwt']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      'oauth-client:create',
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      'oauth-client:update',
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.disable)).toEqual([
      'oauth-client:disable',
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.rotateSecret),
    ).toEqual(['oauth-client:rotate-secret']);
  });
});
