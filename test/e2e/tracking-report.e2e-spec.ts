/* eslint-disable */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  TargetTrackingReportType,
  TrackingReportCadence,
  TrackingSourceType,
  TrackingTargetType,
} from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PermService } from '../../src/admin/permission/services/permission.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('TrackingReportController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const businessTargetId = `tracking-target-${Date.now()}`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PermService)
      .useValue({
        hasAnyPermission: () => true,
        hasAllPermissions: () => true,
        getPermByRoleCodes: () => ['tracking-report:read'],
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: { id: businessTargetId, username: businessTargetId, active: true },
    });
    token = app
      .get(JwtService)
      .sign({ sub: businessTargetId, roles: ['admin'] });
  });

  afterAll(async () => {
    const target = await prisma.trackingTarget.findUnique({
      where: {
        targetType_targetId: {
          targetType: TrackingTargetType.USER,
          targetId: businessTargetId,
        },
      },
    });
    if (target) {
      await prisma.trackingReport.deleteMany({
        where: { targetId: target.id },
      });
      await prisma.trackingTarget.delete({ where: { id: target.id } });
    }
    await prisma.user.deleteMany({ where: { id: businessTargetId } });
    await app.close();
  });

  it('creates, lists, updates, reads and soft-deletes a generic tracking report', async () => {
    const body = {
      targetType: TrackingTargetType.USER,
      targetId: businessTargetId,
      targetName: 'Alice',
      targetMetadata: { department: 'Product' },
      trackingType: TargetTrackingReportType.USER_PROFILE,
      cadence: TrackingReportCadence.MONTHLY,
      baseDate: '2026-08-23T10:00:00+08:00',
      timezone: 'Asia/Shanghai',
      content: 'profile v1',
      sources: [
        {
          sourceType: TrackingSourceType.MEETING,
          sourceId: 'meeting-1',
          metadata: { title: 'Kickoff' },
        },
      ],
    };
    const created = await request(app.getHttpServer())
      .post('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        content: 'profile v1',
        periodKey: '2026-08',
        periodStart: '2026-07-31T16:00:00.000Z',
        periodEnd: '2026-08-31T16:00:00.000Z',
        sourceCount: 1,
        target: expect.objectContaining({
          targetType: TrackingTargetType.USER,
          targetId: businessTargetId,
          nameSnapshot: 'Alice',
        }),
      }),
    );

    const list = await request(app.getHttpServer())
      .get('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .query({
        targetType: TrackingTargetType.USER,
        targetId: businessTargetId,
      })
      .expect(200);
    expect(list.body.data[0]).not.toHaveProperty('content');
    expect(list.body.data[0]).toEqual(
      expect.objectContaining({ id: created.body.id, sourceCount: 1 }),
    );

    const updated = await request(app.getHttpServer())
      .put(`/tracking-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'profile v2', sources: [] })
      .expect(200);
    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        content: 'profile v2',
        sourceCount: 0,
      }),
    );

    await request(app.getHttpServer())
      .delete(`/tracking-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/tracking-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects caller-supplied derived period fields', async () => {
    await request(app.getHttpServer())
      .post('/tracking-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: TrackingTargetType.USER,
        targetId: businessTargetId,
        targetName: 'Alice',
        trackingType: TargetTrackingReportType.USER_PROFILE,
        cadence: TrackingReportCadence.MONTHLY,
        baseDate: '2026-08-23T10:00:00+08:00',
        periodStart: '2026-08-01T00:00:00.000Z',
        content: 'invalid caller-derived period',
      })
      .expect(400);
  });
});
