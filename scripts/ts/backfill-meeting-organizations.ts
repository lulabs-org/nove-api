import '../../src/prisma/load-prisma-env';
import { createPrismaAdapter } from '../../src/prisma/prisma-adapter';
import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

function requestedOrgId(): string | undefined {
  const index = process.argv.indexOf('--org-id');
  const value = index >= 0 ? process.argv[index + 1]?.trim() : undefined;
  if (index >= 0 && !value) {
    throw new Error('--org-id requires a value');
  }
  return value;
}

async function resolveOrganizationId(): Promise<string> {
  const explicitOrgId = requestedOrgId();
  if (explicitOrgId) {
    const organization = await prisma.org.findFirst({
      where: { id: explicitOrgId, active: true, deletedAt: null },
      select: { id: true },
    });
    if (!organization) {
      throw new Error(`Active organization ${explicitOrgId} was not found`);
    }
    return organization.id;
  }

  const organizations = await prisma.org.findMany({
    where: { active: true, deletedAt: null },
    select: { id: true },
    take: 2,
  });
  if (organizations.length !== 1) {
    throw new Error(
      `Expected exactly one active organization; found ${organizations.length}. Pass --org-id explicitly.`,
    );
  }
  return organizations[0].id;
}

async function main() {
  const orgId = await resolveOrganizationId();
  const unassigned = await prisma.meeting.count({ where: { orgId: null } });
  const apply = process.argv.includes('--apply');

  console.log(
    JSON.stringify({ mode: apply ? 'apply' : 'dry-run', orgId, unassigned }),
  );
  if (!apply || unassigned === 0) return;

  const result = await prisma.meeting.updateMany({
    where: { orgId: null },
    data: { orgId },
  });
  const remaining = await prisma.meeting.count({ where: { orgId: null } });
  console.log(JSON.stringify({ updated: result.count, remaining }));
  if (remaining !== 0) {
    throw new Error(`${remaining} meetings remain without an organization`);
  }
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
