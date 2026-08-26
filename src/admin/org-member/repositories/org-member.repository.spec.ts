import { PrismaService } from '@/prisma/prisma.service';
import { OrgMemberRepository } from './org-member.repository';

describe('OrgMemberRepository department scope', () => {
  it('uses a list-specific projection instead of loading detail fields', async () => {
    const findMany = jest.fn((query: unknown) => {
      void query;
      return Promise.resolve([]);
    });
    const prisma = {
      orgMember: {
        findMany,
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new OrgMemberRepository(
      prisma as unknown as PrismaService,
    );

    await repository.findList({
      where: { orgId: 'org-1', deletedAt: null },
      skip: 0,
      take: 20,
    });

    const query = findMany.mock.calls[0][0] as {
      select: Record<string, unknown> & {
        primaryDept: { select: Record<string, boolean> };
      };
    };
    expect(query.select).toEqual(
      expect.objectContaining({
        id: true,
        userId: true,
        status: true,
        joinedAt: true,
      }),
    );
    expect(query.select).not.toHaveProperty('orgId');
    expect(query.select).not.toHaveProperty('createdAt');
    expect(query.select).not.toHaveProperty('updatedAt');
    expect(query.select).not.toHaveProperty('deletedAt');
    expect(query.select.primaryDept.select).toEqual({ id: true, name: true });
  });

  it('validates a department once when child departments are not requested', async () => {
    const prisma = {
      dept: {
        findFirst: jest.fn().mockResolvedValue({ id: 'dept-1' }),
        findMany: jest.fn(),
      },
    };
    const repository = new OrgMemberRepository(
      prisma as unknown as PrismaService,
    );

    await expect(
      repository.getDepartmentIds('org-1', 'dept-1', false),
    ).resolves.toEqual(['dept-1']);
    expect(prisma.dept.findMany).not.toHaveBeenCalled();
  });

  it('does not traverse a department outside the requested organization', async () => {
    const prisma = {
      dept: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    const repository = new OrgMemberRepository(
      prisma as unknown as PrismaService,
    );

    await expect(
      repository.getDepartmentIds('org-1', 'foreign-dept', true),
    ).resolves.toEqual([]);
    expect(prisma.dept.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-dept', orgId: 'org-1', deletedAt: null },
      select: { id: true },
    });
    expect(prisma.dept.findMany).not.toHaveBeenCalled();
  });
});
