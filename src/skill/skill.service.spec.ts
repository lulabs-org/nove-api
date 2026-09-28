/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as JSZip from 'jszip';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ObjectStorage } from '@/storage/object-storage.interface';
import { SkillRepository } from './skill.repository';
import { SkillService } from './skill.service';

const manifest =
  '---\nname: demo-skill\ndescription: A useful skill\n---\n# Demo\n';

async function uploadFile(code = 'demo-skill') {
  const zip = new JSZip();
  zip.file('SKILL.md', manifest.replace('demo-skill', code));
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return {
    buffer,
    size: buffer.length,
    mimetype: 'application/zip',
    originalname: 'demo.zip',
  };
}

describe('SkillService', () => {
  const objectStorage = {
    putObject: jest.fn().mockResolvedValue({ key: 'stored', url: 'unused' }),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    getBucket: jest.fn().mockReturnValue('private-bucket'),
    getObjectStream: jest.fn(),
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'skill-id' }]),
    skill: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'skill-id', currentVersion: '1.0.0' }),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'skill-id', currentVersion: '1.0.0' }),
      update: jest
        .fn()
        .mockResolvedValue({ id: 'skill-id', currentVersion: '2.0.0' }),
      delete: jest.fn().mockResolvedValue({}),
    },
    skillVersion: {
      create: jest.fn().mockResolvedValue({ id: 'version-id' }),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    skill: { findUnique: jest.fn(), update: jest.fn() },
    skillVersion: { findUnique: jest.fn() },
    storageObject: {
      create: jest.fn().mockResolvedValue({ id: 'storage-id' }),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  let service: SkillService;

  beforeEach(() => {
    jest.clearAllMocks();
    objectStorage.putObject.mockResolvedValue({ key: 'stored', url: 'unused' });
    objectStorage.deleteObject.mockResolvedValue(undefined);
    tx.skill.create.mockResolvedValue({
      id: 'skill-id',
      currentVersion: '1.0.0',
    });
    tx.skill.findUnique.mockResolvedValue({
      id: 'skill-id',
      currentVersion: '1.0.0',
    });
    tx.skillVersion.create.mockResolvedValue({ id: 'version-id' });
    prisma.skill.findUnique.mockResolvedValue(null);
    prisma.skillVersion.findUnique.mockResolvedValue(null);
    prisma.storageObject.create.mockResolvedValue({ id: 'storage-id' });
    prisma.storageObject.delete.mockResolvedValue({});
    prisma.storageObject.findMany.mockResolvedValue([]);
    tx.skillVersion.findUnique.mockResolvedValue(null);
    service = new SkillService(
      new SkillRepository(prisma as unknown as PrismaService),
      objectStorage as unknown as ObjectStorage,
    );
  });

  it('imports the first version and stores the original Zip with its checksum', async () => {
    const file = await uploadFile();
    await expect(
      service.importZip({ version: '1.0.0' }, file),
    ).resolves.toEqual({ id: 'skill-id', currentVersion: '1.0.0' });
    expect(objectStorage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ body: file.buffer, access: 'private' }),
    );
    expect(prisma.storageObject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sizeBytes: BigInt(file.size),
        checksumSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    });
    expect(tx.skill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'demo-skill',
          currentVersion: '1.0.0',
        }),
      }),
    );
  });

  it('does not auto-switch when adding a version and rejects duplicate or mismatched packages', async () => {
    prisma.skill.findUnique.mockResolvedValue({
      id: 'skill-id',
      code: 'demo-skill',
      currentVersion: '1.0.0',
    });
    await expect(
      service.addVersion('skill-id', { version: '2.0.0' }, await uploadFile()),
    ).resolves.toEqual({ id: 'version-id' });
    expect(tx.skillVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ skillId: 'skill-id', version: '2.0.0' }),
    });
    expect(prisma.skill.update).not.toHaveBeenCalled();

    prisma.skillVersion.findUnique.mockResolvedValue({ id: 'version-id' });
    await expect(
      service.addVersion('skill-id', { version: '2.0.0' }, await uploadFile()),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.addVersion(
        'skill-id',
        { version: '3.0.0' },
        await uploadFile('other-skill'),
      ),
    ).rejects.toThrow();
    expect(objectStorage.putObject).toHaveBeenCalledTimes(1);
  });

  it('removes an uploaded object if the database write fails', async () => {
    tx.skill.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(
      service.importZip({ version: '1.0.0' }, await uploadFile()),
    ).rejects.toThrow('database unavailable');
    expect(objectStorage.deleteObject).toHaveBeenCalledTimes(1);
    expect(prisma.storageObject.delete).toHaveBeenCalledWith({
      where: { id: 'storage-id' },
    });
  });

  it('rejects deletion of the current version and cleans up a non-current version', async () => {
    await expect(
      service.deleteVersion('skill-id', '1.0.0'),
    ).rejects.toBeInstanceOf(ConflictException);
    tx.skillVersion.findUnique.mockResolvedValue({
      id: 'version-id',
      packageStorageId: 'storage-id',
      packageStorage: { objectKey: 'skill-packages/old.zip' },
    });
    await service.deleteVersion('skill-id', '0.9.0');
    expect(tx.skillVersion.delete).toHaveBeenCalledWith({
      where: { id: 'version-id' },
    });
    expect(prisma.storageObject.delete).toHaveBeenCalledWith({
      where: { id: 'storage-id' },
    });
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'skill-packages/old.zip',
    );
  });

  it('activates only a version that belongs to the locked skill', async () => {
    await expect(service.activate('skill-id', '2.0.0')).rejects.toThrow();
    tx.skillVersion.findUnique.mockResolvedValueOnce({ id: 'version-id' });
    await expect(service.activate('skill-id', '2.0.0')).resolves.toEqual({
      id: 'skill-id',
      currentVersion: '2.0.0',
    });
    expect(tx.skill.update).toHaveBeenCalledWith({
      where: { id: 'skill-id' },
      data: { currentVersion: '2.0.0' },
    });
  });

  it('deletes all version records and stored Zip objects with the skill', async () => {
    tx.skill.findUnique.mockResolvedValueOnce({
      id: 'skill-id',
      versions: [
        {
          packageStorageId: 'storage-1',
          packageStorage: { objectKey: 'skill-packages/one.zip' },
        },
        {
          packageStorageId: 'storage-2',
          packageStorage: { objectKey: 'skill-packages/two.zip' },
        },
      ],
    });
    await service.delete('skill-id');
    expect(tx.skill.delete).toHaveBeenCalledWith({ where: { id: 'skill-id' } });
    expect(prisma.storageObject.delete).toHaveBeenCalledWith({
      where: { id: 'storage-1' },
    });
    expect(prisma.storageObject.delete).toHaveBeenCalledWith({
      where: { id: 'storage-2' },
    });
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'skill-packages/one.zip',
    );
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'skill-packages/two.zip',
    );
  });

  it('retains a cleanup record after OSS failure and retries it later', async () => {
    tx.skillVersion.findUnique.mockResolvedValue({
      id: 'version-id',
      packageStorageId: 'storage-id',
      packageStorage: { objectKey: 'skill-packages/old.zip' },
    });
    objectStorage.deleteObject.mockRejectedValueOnce(
      new Error('OSS unavailable'),
    );
    await expect(service.deleteVersion('skill-id', '0.9.0')).rejects.toThrow();
    expect(prisma.storageObject.delete).not.toHaveBeenCalled();

    prisma.storageObject.findMany.mockResolvedValueOnce([
      { id: 'storage-id', objectKey: 'skill-packages/old.zip' },
    ]);
    await service.cleanupUnreferencedPackages();
    expect(objectStorage.deleteObject).toHaveBeenCalledTimes(2);
    expect(prisma.storageObject.delete).toHaveBeenCalledWith({
      where: { id: 'storage-id' },
    });
  });
});
