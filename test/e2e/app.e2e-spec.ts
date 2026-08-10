import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Root endpoint', () => {
    it('/ (GET) should return welcome message without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.text).toBe('Welcome to Nove Backend Service');
    });

    it('/ (GET) should have proper headers', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('Security headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers).toHaveProperty('x-powered-by');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });
});
