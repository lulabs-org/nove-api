import {
  DriveFileManagedBy,
  DriveNodeType,
  DriveSpaceType,
  FileBindingTargetType,
  FileVersionStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { basename } from 'node:path';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

function recordId(value: unknown): string {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string'
  ) {
    throw new Error('expected a database record id');
  }
  return value.id;
}

function meetingPath(date: Date, meetingId: string): string[] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;
  return ['会议资料', year, month, meetingId];
}

async function ensureSpace(orgId: string | null) {
  const where = orgId
    ? { type: DriveSpaceType.ORG, orgId, deletedAt: null }
    : { type: DriveSpaceType.SYSTEM_UNASSIGNED, deletedAt: null };
  const existing = await prisma.driveSpace.findFirst({ where });
  if (existing) return existing;
  const org = orgId
    ? await prisma.org.findUniqueOrThrow({ where: { id: orgId } })
    : null;
  return prisma.driveSpace.create({
    data: {
      type: orgId ? DriveSpaceType.ORG : DriveSpaceType.SYSTEM_UNASSIGNED,
      orgId,
      name: org ? `${org.name}团队空间` : '待归属会议文件',
    },
  });
}

async function ensureFolder(spaceId: string, names: string[]): Promise<string> {
  let parentId: string | null = null;
  for (const name of names) {
    const where = {
      spaceId,
      parentId,
      type: DriveNodeType.FOLDER,
      deletedAt: null,
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
    };
    const found: unknown = await prisma.driveNode.findFirst({
      where,
      select: { id: true },
    });
    let node: { id: string } | null = found ? { id: recordId(found) } : null;
    if (!node) {
      try {
        const created: unknown = await prisma.driveNode.create({
          data: { spaceId, parentId, type: DriveNodeType.FOLDER, name },
          select: { id: true },
        });
        node = { id: recordId(created) };
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        const concurrent: unknown = await prisma.driveNode.findFirstOrThrow({
          where,
          select: { id: true },
        });
        node = { id: recordId(concurrent) };
      }
    }
    parentId = node.id;
  }
  if (!parentId) throw new Error('meeting folder path must not be empty');
  return parentId;
}

async function uniqueName(
  spaceId: string,
  parentId: string,
  originalName: string,
  suffix: string,
) {
  const clean = originalName.slice(0, 255) || `minute-file-${suffix}`;
  const exists = await prisma.driveNode.count({
    where: {
      spaceId,
      parentId,
      deletedAt: null,
      name: { equals: clean, mode: 'insensitive' },
    },
  });
  if (!exists) return clean;
  const dot = clean.lastIndexOf('.');
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : '';
  return `${stem.slice(0, 230)}-${suffix.slice(-12)}${extension}`;
}

async function backfillOne(id: string) {
  const record = await prisma.minuteFile.findUniqueOrThrow({
    where: { id },
    include: {
      object: true,
      minute: { include: { meeting: true } },
    },
  });
  if (record.fileBindingId) return 'skipped';
  const space = await ensureSpace(record.minute.meeting?.orgId ?? null);
  const meetingId = record.minute.meetingId ?? `unassigned-${record.minuteId}`;
  const parentId = await ensureFolder(
    space.id,
    meetingPath(
      record.minute.meeting?.startAt ?? record.minute.createdAt,
      meetingId,
    ),
  );
  const objectName = decodeURIComponent(
    basename(record.object.objectKey.split('?')[0]),
  );
  const name = await uniqueName(space.id, parentId, objectName, record.id);

  await prisma.$transaction(async (tx) => {
    const file = await tx.driveFile.create({
      data: { managedBy: DriveFileManagedBy.SYSTEM, createdById: null },
    });
    await tx.fileVersion.create({
      data: {
        fileId: file.id,
        version: 1,
        storageObjectId: record.fileObjectId,
        status: FileVersionStatus.ACTIVE,
        originalName: name,
        contentType: record.object.contentType ?? 'application/octet-stream',
        sizeBytes: record.object.sizeBytes,
        checksumSha256: record.object.checksumSha256,
      },
    });
    await tx.driveNode.create({
      data: {
        spaceId: space.id,
        parentId,
        type: DriveNodeType.FILE,
        name,
        fileId: file.id,
        createdById: null,
        createdAt: record.createdAt,
      },
    });
    const binding = await tx.fileBinding.create({
      data: {
        fileId: file.id,
        targetType: FileBindingTargetType.MINUTE,
        targetId: record.minuteId,
        purpose: record.fileType,
        metadata: { backfilledFromMinuteFileId: record.id },
      },
    });
    await tx.minuteFile.update({
      where: { id: record.id },
      data: { fileBindingId: binding.id },
    });
  });
  return 'created';
}

async function main() {
  const total = await prisma.minuteFile.count({
    where: { deletedAt: null, fileBindingId: null },
  });
  if (!apply) {
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        pending: total,
        hint: 'rerun with --apply',
      }),
    );
    return;
  }

  let created = 0;
  let skipped = 0;
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.minuteFile.findMany({
      where: { deletedAt: null, fileBindingId: null },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true },
    });
    if (!batch.length) break;
    for (const item of batch) {
      const result = await backfillOne(item.id);
      if (result === 'created') created += 1;
      else skipped += 1;
    }
    cursor = batch.at(-1)!.id;
    console.log(JSON.stringify({ progress: { created, skipped, total } }));
  }
  console.log(JSON.stringify({ mode: 'apply', created, skipped, total }));
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
