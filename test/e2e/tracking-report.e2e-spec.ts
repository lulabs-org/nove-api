/* eslint-disable */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PermService } from '../../src/admin/permission/services/permission.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('TrackingReportController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const userId = `tracking-user-${Date.now()}`;
  let projectId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PermService)
      .useValue({
        hasAnyPermission: () => true,
        hasAllPermissions: () => true,
        getPermByRoleCodes: () => [
          'user:read',
          'user:create',
          'user:update',
          'user:delete',
        ],
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: { id: userId, username: userId, active: true },
    });
    projectId = (
      await prisma.project.create({
        data: { title: `Tracking project ${Date.now()}` },
      })
    ).id;
    token = app.get(JwtService).sign({ sub: userId, roles: ['admin'] });
  });

  afterAll(async () => {
    await prisma.userTrackingReport.deleteMany({
      where: { subjectUserId: userId },
    });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await app.close();
  });

  it.each([
    TrackingReportType.PERIODIC_MEETING_SUMMARY,
    TrackingReportType.TRAINING_PLAN,
    TrackingReportType.USER_PROFILE,
  ])('creates, lists and versions %s reports', async (trackingType) => {
    const body = {
      subjectUserId: userId,
      subjectNameSnapshot: 'Alice',
      trackingType,
      cadence: TrackingCadence.MONTHLY,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T23:59:59.999Z',
      content: `${trackingType} v1`,
      structuredData: { source: 'e2e' },
    };
    const created = await request(app.getHttpServer())
      .post('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    expect(created.body.version).toBe(1);
    const updated = await request(app.getHttpServer())
      .put(`/tracking-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: `${trackingType} v2` })
      .expect(200);
    expect(updated.body.version).toBe(2);
    expect(updated.body.id).not.toBe(created.body.id);
    const list = await request(app.getHttpServer())
      .get('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .query({ subjectUserId: userId, trackingType })
      .expect(200);
    expect(list.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: updated.body.id, isLatest: true }),
      ]),
    );
  });

  it('rejects project progress without a project', async () => {
    await request(app.getHttpServer())
      .post('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subjectUserId: userId,
        subjectNameSnapshot: 'Alice',
        trackingType: TrackingReportType.PROJECT_PROGRESS,
        cadence: TrackingCadence.MONTHLY,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.999Z',
        content: 'progress',
      })
      .expect(400);
  });

  it('creates project-scoped progress', async () => {
    const response = await request(app.getHttpServer())
      .post('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subjectUserId: userId,
        projectId,
        subjectNameSnapshot: 'Alice',
        trackingType: TrackingReportType.PROJECT_PROGRESS,
        cadence: TrackingCadence.MONTHLY,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.999Z',
        content: 'progress',
      })
      .expect(201);
    expect(response.body.projectId).toBe(projectId);
  });
});
