/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PermService } from '../../../src/admin/permission/services/permission.service';
import { JwtService } from '@nestjs/jwt';
import { SpeakerSummaryService } from '../../../src/minute/services';
import {
  MeetingPlatform,
  MeetingType,
  Platform,
  RecordingSource,
} from '@prisma/client';

describe('ParticipantSummaryController (e2e)', () => {
  const generateSummaries = jest.fn().mockResolvedValue([]);
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let createdMeetingId: string;
  let createdSummaryId: string;
  let updatedSummaryId: string;
  let createdRecordingId: string;
  let otherRecordingId: string;
  let platformUserId: string;
  let authToken: string;
  const testUserId = 'test_user_id_' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SpeakerSummaryService)
      .useValue({ generateSummaries })
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
        username: 'e2e_part_sum_' + Date.now(),
        email: 'e2epart' + Date.now() + '@test.com',
        phone: '1383' + Math.floor(Math.random() * 10000000).toString(),
        passwordHash: 'hash',
        active: true,
      },
    });

    authToken = jwtService.sign({ sub: testUserId, roles: ['admin'] });

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Test Meeting for Participant Summary',
        platform: MeetingPlatform.TENCENT_MEETING,
        platformMeetingId: 'test_meeting_part_' + Date.now(),
        type: MeetingType.SCHEDULED,
        durationSeconds: 3600,
      });
    createdMeetingId = meetingRes.body.id;
    const platformUser = await prisma.platformUser.create({
      data: {
        platform: Platform.TENCENT_MEETING,
        ptUnionId: `e2e-union-${Date.now()}`,
        displayName: 'Test Participant',
      },
    });
    platformUserId = platformUser.id;
    const recording = await prisma.minute.create({
      data: {
        meetingId: createdMeetingId,
        source: RecordingSource.USER_MANUAL,
      },
    });
    createdRecordingId = recording.id;
    otherRecordingId = (
      await prisma.minute.create({
        data: {
          meetingId: createdMeetingId,
          source: RecordingSource.USER_MANUAL,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }
    if (createdSummaryId) {
      await prisma.speakerSummary.deleteMany({
        where: {
          minuteId: createdRecordingId,
          platformUserId,
        },
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
    await prisma.platformUser.deleteMany({ where: { id: platformUserId } });
    await app.close();
  });

  describe('/minutes/:minuteId/speaker-summaries (POST)', () => {
    it('should create a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .post(`/minutes/${createdRecordingId}/speaker-summaries`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platformUserId,
          partSummary: 'Participant summary content.',
          keywords: ['participant', 'test'],
        });

      if (response.status !== 201) {
        throw new Error(
          `Failed to create participant summary: ${JSON.stringify(response.body)}`,
        );
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.partSummary).toBe('Participant summary content.');
      createdSummaryId = response.body.id;
    });
  });

  describe('/minutes/:minuteId/speaker-summaries/generate (POST)', () => {
    it('passes the recording scope to participant summary generation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/minutes/${createdRecordingId}/speaker-summaries/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ platformUserIds: [platformUserId] })
        .expect(200)
        .expect({
          success: true,
          message: '参会者总结生成完成',
          data: [],
        });

      expect(generateSummaries).toHaveBeenCalledWith({
        recordId: createdRecordingId,
        platformUserIds: [platformUserId],
      });
    });
  });

  describe('/minutes/:minuteId/speaker-summaries (GET)', () => {
    it('should get participant summaries list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/minutes/${createdRecordingId}/speaker-summaries`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, page: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(
        response.body.data.some((s: any) => s.id === createdSummaryId),
      ).toBe(true);
    });
  });

  describe('/minutes/:minuteId/speaker-summaries/:id (GET)', () => {
    it('should get a specific participant summary', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/minutes/${createdRecordingId}/speaker-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdSummaryId);
    });

    it('rejects a summary through another recording boundary', async () => {
      await request(app.getHttpServer())
        .get(
          `/minutes/${otherRecordingId}/speaker-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/minutes/:minuteId/speaker-summaries/:id (PUT)', () => {
    it('should update a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .put(
          `/minutes/${createdRecordingId}/speaker-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          partSummary: 'Updated participant summary content.',
        })
        .expect(200);

      expect(response.body.id).toBe(createdSummaryId);
      updatedSummaryId = response.body.id;
      expect(response.body.partSummary).toBe(
        'Updated participant summary content.',
      );
    });
  });

  describe('/minutes/:minuteId/speaker-summaries/:id (DELETE)', () => {
    it('should delete a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/minutes/${createdRecordingId}/speaker-summaries/${updatedSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(
          `/minutes/${createdRecordingId}/speaker-summaries/${updatedSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
