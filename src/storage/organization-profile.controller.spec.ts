import * as request from 'supertest';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { OrganizationProfileController } from './organization-profile.controller';
import { OrganizationProfileDto } from './organization-profile.dto';
import { validationPipeOptions } from '@/configs/app.config';

describe('OrganizationProfileController', () => {
  const service = { save: jest.fn() };
  const controller = new OrganizationProfileController(service as never);
  beforeEach(() => jest.clearAllMocks());

  it('rejects attempts to update another organization', () => {
    expect(() => controller.save('org-1', 'org-2', {})).toThrow(
      ForbiddenException,
    );
    expect(service.save).not.toHaveBeenCalled();
  });
  it('passes current organization form and file to the service', async () => {
    const file = {
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      size: 5,
    };
    await controller.save('org-1', 'org-1', { name: 'Acme' }, file);
    expect(service.save).toHaveBeenCalledWith('org-1', { name: 'Acme' }, file);
  });
  it.each([
    ['false', false],
    ['true', true],
  ])('parses multipart active=%s correctly', async (input, expected) => {
    const pipe = new ValidationPipe(validationPipeOptions);
    const result: unknown = await pipe.transform(
      { name: 'Acme', active: input, logoAction: 'keep' },
      { type: 'body', metatype: OrganizationProfileDto },
    );
    expect(result).toMatchObject({ name: 'Acme', active: expected });
  });
  it('rejects invalid multipart field values', async () => {
    const pipe = new ValidationPipe(validationPipeOptions);
    await expect(
      pipe.transform(
        { active: 'invalid', logoAction: 'anything' },
        { type: 'body', metatype: OrganizationProfileDto },
      ),
    ).rejects.toThrow();
  });
});

describe('OrganizationProfileController multipart contract', () => {
  let app: import('@nestjs/common').INestApplication;
  const save = jest.fn();
  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    const { OrganizationProfileService } = await import(
      './organization-profile.service'
    );
    const module = await Test.createTestingModule({
      controllers: [OrganizationProfileController],
      providers: [{ provide: OrganizationProfileService, useValue: { save } }],
    }).compile();
    app = module.createNestApplication();
    app.use(
      (
        req: { authContext?: { orgId: string } },
        _res: unknown,
        next: () => void,
      ) => {
        req.authContext = { orgId: 'org-1' };
        next();
      },
    );
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    save.mockReset();
    save.mockResolvedValue({ id: 'org-1', name: 'Acme' });
  });

  it('parses file and form fields in the same request', async () => {
    await request(app.getHttpServer() as import('http').Server)
      .put('/admin/orgs/org-1/profile')
      .field('name', 'Acme')
      .field('active', 'false')
      .field('logoAction', 'keep')
      .attach('file', Buffer.from('image bytes'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(200);
    expect(save).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        name: 'Acme',
        active: false,
        logoAction: 'keep',
      }),
      expect.objectContaining({
        mimetype: 'image/png',
        buffer: Buffer.from('image bytes'),
      }),
    );
  });
  it('rejects oversized uploads before reaching the service', async () => {
    await request(app.getHttpServer() as import('http').Server)
      .put('/admin/orgs/org-1/profile')
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(save).not.toHaveBeenCalled();
  });
  it('rejects another organization and unknown form fields', async () => {
    await request(app.getHttpServer() as import('http').Server)
      .put('/admin/orgs/org-2/profile')
      .field('name', 'Acme')
      .expect(403);
    await request(app.getHttpServer() as import('http').Server)
      .put('/admin/orgs/org-1/profile')
      .field('logo', 'https://untrusted.example/logo.png')
      .expect(400);
    await request(app.getHttpServer() as import('http').Server)
      .put('/admin/orgs/org-1/profile')
      .field('code', 'MANUAL')
      .expect(400);
    expect(save).not.toHaveBeenCalled();
  });
});
