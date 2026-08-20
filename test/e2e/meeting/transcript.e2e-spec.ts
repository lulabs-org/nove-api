/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PermService } from '../../../src/admin/permission/services/permission.service';
import { JwtService } from '@nestjs/jwt';
import {
  MeetingPlatform,
  MeetingType,
  RecordingSource,
  RecordingStatus,
} from '@prisma/client';

describe('TranscriptController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let createdMeetingId: string;
  let createdRecordingId: string;
  let createdTranscriptId: string;
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
        username: 'e2e_ts_user_' + Date.now(),
        email: 'e2ets' + Date.now() + '@test.com',
        phone: '1384' + Math.floor(Math.random() * 10000000).toString(),
        passwordHash: 'hash',
        active: true,
      },
    });

    authToken = jwtService.sign({ sub: testUserId, roles: ['admin'] });

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Test Meeting for Transcript',
        platform: MeetingPlatform.TENCENT_MEETING,
        platformMeetingId: 'test_meeting_ts_' + Date.now(),
        type: MeetingType.SCHEDULED,
        durationSeconds: 3600,
      });
    createdMeetingId = meetingRes.body.id;

    const recordingRes = await request(app.getHttpServer())
      .post('/recordings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meetingId: createdMeetingId,
        source: RecordingSource.PLATFORM_AUTO,
        status: RecordingStatus.COMPLETED,
      });
    createdRecordingId = recordingRes.body.id;
  });

  afterAll(async () => {
    if (createdTranscriptId) {
      await prisma.transcript.deleteMany({
        where: { id: createdTranscriptId },
      });
    }
    if (createdRecordingId) {
      await prisma.minute.deleteMany({
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

  describe('/transcripts (POST)', () => {
    it('should create a transcript', async () => {
      const response = await request(app.getHttpServer())
        .post('/transcripts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          minuteId: createdRecordingId,
          source: 'System Generated',
          status: 1,
        });

      if (response.status !== 201) {
        throw new Error(
          `Failed to create transcript: ${JSON.stringify(response.body)}`,
        );
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.minuteId).toBe(createdRecordingId);
      createdTranscriptId = response.body.id;
    });
  });

  describe('/transcripts (GET)', () => {
    it('should get transcripts list', async () => {
      const response = await request(app.getHttpServer())
        .get('/transcripts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, page: 1, minuteId: createdRecordingId })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(
        response.body.data.some((t: any) => t.id === createdTranscriptId),
      ).toBe(true);
    });
  });

  describe('/transcripts/:id (GET)', () => {
    it('should get a specific transcript', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transcripts/${createdTranscriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdTranscriptId);
      expect(response.body.minuteId).toBe(createdRecordingId);
    });
  });

  describe('/transcripts/:id (DELETE)', () => {
    it('should delete a transcript', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/transcripts/${createdTranscriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/transcripts/${createdTranscriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
