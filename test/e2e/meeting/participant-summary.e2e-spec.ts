/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { PermService } from '../../../src/permission/services/permission.service';
import { JwtService } from '@nestjs/jwt';
import { MeetingPlatform, MeetingType, PeriodType } from '@prisma/client';

describe('ParticipantSummaryController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let createdMeetingId: string;
  let createdSummaryId: string;
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
        hostUserName: 'Test User',
        duration: 60,
      });
    createdMeetingId = meetingRes.body.id;
  });

  afterAll(async () => {
    if (createdSummaryId) {
      await prisma.participantSummary.deleteMany({
        where: { id: createdSummaryId },
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

  describe('/meetings/:meetingId/participant-summaries (POST)', () => {
    it('should create a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .post(`/meetings/${createdMeetingId}/participant-summaries`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          periodType: PeriodType.SINGLE,
          userName: 'Test Participant',
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
      expect(response.body.meetingId).toBe(createdMeetingId);
      expect(response.body.userName).toBe('Test Participant');
      expect(response.body.partSummary).toBe('Participant summary content.');
      createdSummaryId = response.body.id;
    });
  });

  describe('/meetings/:meetingId/participant-summaries (GET)', () => {
    it('should get participant summaries list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/meetings/${createdMeetingId}/participant-summaries`)
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

  describe('/meetings/:meetingId/participant-summaries/:id (GET)', () => {
    it('should get a specific participant summary', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/meetings/${createdMeetingId}/participant-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdSummaryId);
      expect(response.body.meetingId).toBe(createdMeetingId);
    });
  });

  describe('/meetings/:meetingId/participant-summaries/:id (PUT)', () => {
    it('should update a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .put(
          `/meetings/${createdMeetingId}/participant-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          periodType: PeriodType.SINGLE,
          userName: 'Test Participant',
          partSummary: 'Updated participant summary content.',
        })
        .expect(200);

      expect(response.body.id).toBe(createdSummaryId);
      expect(response.body.partSummary).toBe(
        'Updated participant summary content.',
      );
    });
  });

  describe('/meetings/:meetingId/participant-summaries/:id (DELETE)', () => {
    it('should delete a participant summary', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/meetings/${createdMeetingId}/participant-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(
          `/meetings/${createdMeetingId}/participant-summaries/${createdSummaryId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
