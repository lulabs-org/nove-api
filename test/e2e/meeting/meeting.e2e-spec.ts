/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { MeetingPlatform, MeetingType } from '@prisma/client';

import { PermService } from '../../../src/admin/permission/services/permission.service';

import { JwtService } from '@nestjs/jwt';

describe('MeetingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let createdMeetingId: string;
  let authToken: string;
  const testUserId = 'test_user_id_' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PermService)
      .useValue({
        hasAnyPermission: () => true,
        hasAllPermissions: () => true,
        getPermByRoleCodes: () => [
          'meeting:read',
          'meeting:create',
          'meeting:update',
          'meeting:delete',
          'meeting:stats_view',
        ],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create a mock user in DB
    await prisma.user.create({
      data: {
        id: testUserId,
        username: 'e2e_test_user_' + Date.now(),
        email: 'e2e' + Date.now() + '@test.com',
        phone: '1380' + Math.floor(Math.random() * 10000000).toString(),
        passwordHash: 'hash',
        active: true,
      },
    });

    authToken = jwtService.sign({ sub: testUserId, roles: ['admin'] });
  });

  afterAll(async () => {
    if (createdMeetingId) {
      await prisma.meeting.deleteMany({
        where: { id: createdMeetingId },
      });
    }
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await app.close();
  });

  describe('/meetings (POST)', () => {
    it('should create a meeting record', async () => {
      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'E2E Test Meeting',
          platform: MeetingPlatform.TENCENT_MEETING,
          platformMeetingId: 'test_meeting_' + Date.now(),
          type: MeetingType.SCHEDULED,
          durationSeconds: 3600,
          actualStartAt: new Date().toISOString(),
          endedAt: new Date(Date.now() + 3600000).toISOString(),
        });

      if (response.status !== 201) {
        throw new Error(
          `Failed to create meeting: ${JSON.stringify(response.body)}`,
        );
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('E2E Test Meeting');
      expect(response.body.durationSeconds).toBe(3600);
      createdMeetingId = response.body.id;
    });

    it('should fail if required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Missing Platform',
        })
        .expect(400);
    });
  });

  describe('/meetings (GET)', () => {
    it('should get meeting records list', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, page: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(
        response.body.data.some((m: any) => m.id === createdMeetingId),
      ).toBe(true);
    });
  });

  describe('/meetings/:id (GET)', () => {
    it('should get a specific meeting record', async () => {
      const response = await request(app.getHttpServer())
        .get(`/meetings/${createdMeetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdMeetingId);
      expect(response.body.title).toBe('E2E Test Meeting');
      expect(response.body).not.toHaveProperty('createdById');
      expect(response.body).toHaveProperty('recordings');
    });

    it('should return 404 for non-existent meeting', async () => {
      await request(app.getHttpServer())
        // using a mock cuid to pass the validation pipe
        .get('/meetings/clq5xxxxxxxxx000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/meetings/:id (PATCH)', () => {
    it('should update a meeting record', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/meetings/${createdMeetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated E2E Test Meeting',
          durationSeconds: 0,
          participantCount: 0,
        })
        .expect(200);

      expect(response.body.id).toBe(createdMeetingId);
      expect(response.body.title).toBe('Updated E2E Test Meeting');
      expect(response.body.durationSeconds).toBe(0);
      expect(response.body.participantCount).toBe(0);
    });
  });

  describe('/meetings/stats/summary (GET)', () => {
    it('should get meeting stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/meetings/stats/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('platformStats');
    });

    it('should reject invalid and inverted date ranges', async () => {
      await request(app.getHttpServer())
        .get('/meetings/stats/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: 'not-a-date' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/meetings/stats/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2026-08-31T23:59:59.999+08:00',
          endDate: '2026-08-01T00:00:00.000+08:00',
        })
        .expect(400);
    });
  });

  describe('/meetings/:id (DELETE)', () => {
    it('should delete a meeting record', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/meetings/${createdMeetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedAt).toBe(response.body.deletedAt);
    });
  });
});
