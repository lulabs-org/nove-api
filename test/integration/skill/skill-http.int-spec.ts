import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { validationPipeOptions } from '@/configs/app.config';
import { SkillController } from '@/skill/skill.controller';
import { SkillService } from '@/skill/skill.service';

describe('Skill HTTP contract', () => {
  let app: INestApplication;
  const service = {
    importZip: jest.fn(),
    addVersion: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    download: jest.fn(),
    activate: jest.fn(),
    deleteVersion: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SkillController],
      providers: [{ provide: SkillService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('parses multipart upload and keeps the original Zip bytes', async () => {
    const bytes = Buffer.from('PK\x03\x04fake zip');
    service.importZip.mockResolvedValue({
      id: 'skill-1',
      currentVersion: '1.0.0',
    });
    await request(app.getHttpServer() as import('http').Server)
      .post('/api/v1/skills/import-zip')
      .field('version', '1.0.0')
      .field('changelog', 'First release')
      .attach('file', bytes, {
        filename: 'demo.zip',
        contentType: 'application/zip',
      })
      .expect(201);
    expect(service.importZip).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0.0', changelog: 'First release' }),
      expect.objectContaining({ buffer: bytes, originalname: 'demo.zip' }),
    );
  });

  it('enforces upload size and version field validation', async () => {
    await request(app.getHttpServer() as import('http').Server)
      .post('/api/v1/skills/import-zip')
      .field('version', '')
      .attach('file', Buffer.from('PK\x03\x04'), {
        filename: 'demo.zip',
        contentType: 'application/zip',
      })
      .expect(400);
    await request(app.getHttpServer() as import('http').Server)
      .post('/api/v1/skills/import-zip')
      .field('version', '1.0.0')
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'demo.zip',
        contentType: 'application/zip',
      })
      .expect(413);
    expect(service.importZip).not.toHaveBeenCalled();
  });

  it('streams the saved original Zip as an attachment', async () => {
    const bytes = Buffer.from('PK\x03\x04original');
    service.download.mockResolvedValue({
      stream: Readable.from(bytes),
      fileName: 'demo-skill-1.0.0.zip',
    });
    const response = await request(app.getHttpServer() as import('http').Server)
      .get('/api/v1/skills/skill-1/versions/1.0.0/download')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.body).toEqual(bytes);
    expect(response.headers['content-disposition']).toContain(
      'demo-skill-1.0.0.zip',
    );
  });
});
