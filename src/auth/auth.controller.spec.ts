import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { REQUIRE_AUTH_KEY } from './decorators/require-auth.decorator';

describe('AuthController API key validation', () => {
  it('exposes an API-key-only validation endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'validateApiKey',
    );
    const handler = descriptor?.value as () => { authenticated: true };

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'api-key/validate',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(REQUIRE_AUTH_KEY, handler)).toEqual(['api_key']);
    expect(handler()).toEqual({
      authenticated: true,
    });
  });
});
