import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CurrentOrg } from './current-org.decorator';

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

describe('CurrentOrg Decorator', () => {
  const factory = getParamDecoratorFactory<string>(CurrentOrg);

  function createMockContext(authContext?: { orgId?: string | null }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ authContext }),
      }),
    } as unknown as ExecutionContext;
  }

  it('returns orgId when valid orgId is present in authContext', () => {
    const ctx = createMockContext({ orgId: 'org-123' });
    expect(factory(null, ctx)).toBe('org-123');
  });

  it('throws ForbiddenException when authContext is undefined', () => {
    const ctx = createMockContext(undefined);
    expect(() => factory(null, ctx)).toThrow(ForbiddenException);
    expect(() => factory(null, ctx)).toThrow('Current organization is required');
  });

  it('throws ForbiddenException when orgId is null', () => {
    const ctx = createMockContext({ orgId: null });
    expect(() => factory(null, ctx)).toThrow(ForbiddenException);
    expect(() => factory(null, ctx)).toThrow('Current organization is required');
  });

  it('throws ForbiddenException when orgId is empty or whitespace', () => {
    const ctxEmpty = createMockContext({ orgId: '' });
    expect(() => factory(null, ctxEmpty)).toThrow(ForbiddenException);

    const ctxWhitespace = createMockContext({ orgId: '   ' });
    expect(() => factory(null, ctxWhitespace)).toThrow(ForbiddenException);
  });
});
