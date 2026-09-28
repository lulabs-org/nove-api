import { redisConfig } from './redis.config';

describe('redisConfig', () => {
  const originalUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalUrl;
  });

  it('uses the same default port as ioredis for a secure URL', () => {
    process.env.REDIS_URL = 'rediss://worker:p%40ss@redis.example.com/2';

    expect(redisConfig()).toMatchObject({
      host: 'redis.example.com',
      port: 6379,
      username: 'worker',
      password: 'p@ss',
      db: 2,
      tls: {},
    });
  });

  it('parses an ordinary Redis URL without TLS', () => {
    process.env.REDIS_URL = 'redis://localhost:6381/0';

    expect(redisConfig()).toMatchObject({
      host: 'localhost',
      port: 6381,
      username: '',
      password: '',
      db: 0,
      tls: undefined,
    });
  });

  it('passes an IPv6 host without URL brackets to the queue connection', () => {
    process.env.REDIS_URL = 'redis://[::1]:6381/0';

    expect(redisConfig()).toMatchObject({ host: '::1', port: 6381, db: 0 });
  });

  it.each([
    undefined,
    'not-a-url',
    'http://localhost',
    'redis://localhost/1abc',
  ])('rejects a missing or invalid Redis URL (%s)', (url) => {
    if (url === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = url;
    expect(() => redisConfig()).toThrow();
  });
});
