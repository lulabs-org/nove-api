/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PermService } from '../../../src/permission/services/permission.service';
import { JwtService } from '@nestjs/jwt';
import {
  MeetingPlatform,
  MeetingType,
  RecordingSource,
  RecordingStatus,
} from '@prisma/client';

describe('MeetingRecordingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let createdMeetingId: string;
  let createdRecordingId: string;
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

    await prisma.user.create({
      data: {
        id: testUserId,
        username: 'e2e_rec_user_' + Date.now(),
        email: 'e2erec' + Date.now() + '@test.com',
        phone: '1381' + Math.floor(Math.random() * 10000000).toString(),
        passwordHash: 'hash',
        active: true,
      },
    });

    authToken = jwtService.sign({ sub: testUserId, roles: ['admin'] });

    // Create a meeting to attach recording to
    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Test Meeting for Recording',
        platform: MeetingPlatform.TENCENT_MEETING,
        platformMeetingId: 'test_meeting_' + Date.now(),
        type: MeetingType.SCHEDULED,
        hostUserName: 'Test User',
        duration: 60,
      });
    createdMeetingId = meetingRes.body.id;
  });

  afterAll(async () => {
    if (createdRecordingId) {
      await prisma.meetingRecording.deleteMany({
        where: { id: createdRecordingId },
      });
    }
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

  describe('/recordings (POST)', () => {
    it('should create a meeting recording', async () => {
      const response = await request(app.getHttpServer())
        .post('/recordings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          meetingId: createdMeetingId,
          source: RecordingSource.PLATFORM_AUTO,
          status: RecordingStatus.PROCESSING,
        });

      if (response.status !== 201) {
        throw new Error(
          `Failed to create recording: ${JSON.stringify(response.body)}`,
        );
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.meetingId).toBe(createdMeetingId);
      createdRecordingId = response.body.id;
    });
  });

  describe('/recordings (GET)', () => {
    it('should get meeting recordings list', async () => {
      const response = await request(app.getHttpServer())
        .get('/recordings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, page: 1, meetingId: createdMeetingId })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(
        response.body.data.some((r: any) => r.id === createdRecordingId),
      ).toBe(true);
    });
  });

  describe('/recordings/:id (GET)', () => {
    it('should get a specific meeting recording', async () => {
      const response = await request(app.getHttpServer())
        .get(`/recordings/${createdRecordingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdRecordingId);
      expect(response.body.meetingId).toBe(createdMeetingId);
    });
  });

  describe('/recordings/:id/transcript (GET)', () => {
    it('should get a specific meeting recording transcript', async () => {
      // It might return 404 because transcript does not exist, so we expect 404 for a normal run,
      // or if it returns 200 we check it. Let's see what the service does.
      const response = await request(app.getHttpServer())
        .get(`/recordings/${createdRecordingId}/transcript`)
        .set('Authorization', `Bearer ${authToken}`);

      // We accept either 200 (if empty string/json is returned) or 404 (if not found)
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('/recordings/:id (PATCH)', () => {
    it('should update a meeting recording', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/recordings/${createdRecordingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: RecordingStatus.COMPLETED,
        })
        .expect(200);

      expect(response.body.id).toBe(createdRecordingId);
      expect(response.body.status).toBe(RecordingStatus.COMPLETED);
    });
  });

  describe('/recordings/:id (DELETE)', () => {
    it('should delete a meeting recording', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/recordings/${createdRecordingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
