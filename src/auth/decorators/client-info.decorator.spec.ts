import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import {
  ClientInfo,
  BearerToken,
  ClientInfoContext,
} from './client-info.decorator';

type CustomParamFactory<T = unknown> = (
  data: unknown,
  ctx: ExecutionContext,
) => T;

function getParamDecoratorFactory<T>(
  decorator: () => ParameterDecorator,
): CustomParamFactory<T> {
  class TestTarget {
    testMethod(@decorator() _param: unknown) {
      return _param;
    }
  }
  const args = Reflect.getMetadata(
    '__routeArguments__',
    TestTarget,
    'testMethod',
  ) as Record<string, { factory: CustomParamFactory<T> }>;
  const key = Object.keys(args)[0];
  return args[key].factory;
}

describe('ClientInfo Decorator', () => {
  it('extracts ip and user-agent from request', () => {
    const factory = getParamDecoratorFactory<ClientInfoContext>(ClientInfo);
    const mockRequest = {
      headers: {
        'x-forwarded-for': '203.0.113.195',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
      connection: { remoteAddress: '127.0.0.1' },
      get: (header: string) => {
        if (header.toLowerCase() === 'user-agent') {
          return 'Mozilla/5.0 TestBrowser';
        }
        if (header.toLowerCase() === 'x-forwarded-for') {
          return '203.0.113.195';
        }
        return undefined;
      },
    } as unknown as Request;

    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const result = factory(null, mockCtx);
    expect(result.ip).toBe('203.0.113.195');
    expect(result.userAgent).toBe('Mozilla/5.0 TestBrowser');
  });
});

describe('BearerToken Decorator', () => {
  it('extracts bearer token from authorization header', () => {
    const factory = getParamDecoratorFactory<string | undefined>(BearerToken);
    const mockRequest = {
      get: (header: string) => {
        if (header.toLowerCase() === 'authorization') {
          return 'Bearer my-secret-jwt';
        }
        return undefined;
      },
    } as unknown as Request;

    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const token = factory(null, mockCtx);
    expect(token).toBe('my-secret-jwt');
  });

  it('returns undefined when authorization header is missing or not bearer', () => {
    const factory = getParamDecoratorFactory<string | undefined>(BearerToken);
    const mockRequest = {
      get: () => undefined,
    } as unknown as Request;

    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    expect(factory(null, mockCtx)).toBeUndefined();
  });
});
