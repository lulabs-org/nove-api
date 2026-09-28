import * as JSZip from 'jszip';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { PrismaService } from '@/prisma/prisma.service';
import { ObjectStorage } from '@/storage/object-storage.interface';
import { SkillRepository } from '@/skill/skill.repository';
import { SkillService } from '@/skill/skill.service';
import { assertSafeDatabaseUrl } from '../../test-safety-guard';

describe('Skill version lifecycle with PostgreSQL and object storage', () => {
  let prisma: PrismaService;
  let service: SkillService;
  const objects = new Map<string, Buffer>();
  const code = `skill-${randomUUID()}`;
  let skillId: string | undefined;
  let previousDatabaseUrl: string | undefined;

  const storage: Partial<ObjectStorage> = {
    putObject: ({ key, body }) => {
      objects.set(key, Buffer.from(body));
      return Promise.resolve({ key, url: key });
    },
    deleteObject: (key: string) => {
      objects.delete(key);
      return Promise.resolve();
    },
    getObjectStream: (key: string) => {
      const bytes = objects.get(key);
      if (!bytes) throw new Error('Object missing');
      return Promise.resolve(Readable.from(bytes));
    },
    getBucket: () => 'skill-test-bucket',
  };

  async function zip(description: string, manifestCode = code) {
    const archive = new JSZip();
    archive.file(
      'SKILL.md',
      `---\nname: ${manifestCode}\ndescription: ${description}\n---\n# Demo\n`,
    );
    archive.file('scripts/run.sh', 'echo safe');
    const buffer = await archive.generateAsync({ type: 'nodebuffer' });
    return {
      buffer,
      size: buffer.length,
      originalname: 'skill.zip',
      mimetype: 'application/zip',
    };
  }

  beforeAll(async () => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    const databaseUrl =
      process.env.SKILL_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    assertSafeDatabaseUrl(databaseUrl);
    if (!databaseUrl) throw new Error('Missing test database URL');
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService();
    await prisma.$connect();
    service = new SkillService(
      new SkillRepository(prisma),
      storage as ObjectStorage,
    );
  });

  afterAll(async () => {
    if (skillId) {
      const exists = await prisma.skill.findUnique({ where: { id: skillId } });
      if (exists) await service.delete(skillId);
    }
    await prisma.$disconnect();
    if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('imports, downloads, switches, removes versions and deletes all objects', async () => {
    const firstZip = await zip('First release');
    const skill = await service.importZip({ version: '1.0.0' }, firstZip);
    skillId = skill.id;
    expect(skill.currentVersion).toBe('1.0.0');

    const firstDetail = await service.get(skill.id);
    expect(firstDetail.versions).toHaveLength(1);
    expect(firstDetail.versions[0].sizeBytes).toBe(String(firstZip.size));
    expect(
      (await service.list({ page: 1, pageSize: 10, keyword: code })).items,
    ).toHaveLength(1);
    expect(
      (await service.list({ page: 1, pageSize: 10, keyword: 'not-this-skill' }))
        .items,
    ).toHaveLength(0);
    await service.update(skill.id, {
      name: 'Edited skill',
      category: 'REPORT',
      status: 'DISABLED',
    });
    expect(await service.get(skill.id)).toMatchObject({
      name: 'Edited skill',
      category: 'REPORT',
      status: 'DISABLED',
      currentVersion: '1.0.0',
    });
    expect(
      (
        await service.list({
          page: 1,
          pageSize: 10,
          category: 'REPORT',
          status: 'DISABLED',
        })
      ).items,
    ).toHaveLength(1);
    const downloaded = await service.download(skill.id, '1.0.0');
    const chunks: Buffer[] = [];
    for await (const chunk of downloaded.stream)
      chunks.push(Buffer.from(chunk as Uint8Array));
    expect(Buffer.concat(chunks)).toEqual(firstZip.buffer);

    await expect(
      service.addVersion(
        skill.id,
        { version: '1.0.0' },
        await zip('Duplicate'),
      ),
    ).rejects.toThrow();
    await expect(
      service.addVersion(
        skill.id,
        { version: '2.0.0' },
        await zip('Wrong code', 'another-skill'),
      ),
    ).rejects.toThrow();
    expect(objects.size).toBe(1);
    await service.addVersion(
      skill.id,
      { version: '2.0.0' },
      await zip('Second release'),
    );
    expect((await service.get(skill.id)).currentVersion).toBe('1.0.0');
    await expect(service.deleteVersion(skill.id, '1.0.0')).rejects.toThrow();

    await service.activate(skill.id, '2.0.0');
    await service.deleteVersion(skill.id, '1.0.0');
    expect((await service.get(skill.id)).versions).toHaveLength(1);
    expect(objects.size).toBe(1);

    await service.delete(skill.id);
    skillId = undefined;
    expect(
      await prisma.skill.findUnique({ where: { id: skill.id } }),
    ).toBeNull();
    expect(objects.size).toBe(0);
    expect(
      await prisma.storageObject.count({
        where: { bucket: 'skill-test-bucket' },
      }),
    ).toBe(0);
  });
});
