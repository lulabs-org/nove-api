/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { OrgMemberRepository } from '../repositories/org-member.repository';
import { OrgMemberService } from './org-member.service';

describe('OrgMemberService.createMember', () => {
  const now = new Date('2026-08-05T00:00:00.000Z');
  const member = {
    id: 'member-1',
    orgId: 'org-1',
    userId: 'user-1',
    type: 'INTERNAL',
    status: 'INVITED',
    orgDisplayName: '张三',
    employeeNo: null,
    primaryDeptId: null,
    externalCompany: null,
    title: null,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const activeUser = {
    id: 'user-1',
    username: null,
    email: null,
    countryCode: null,
    phone: null,
    active: true,
    deletedAt: null,
  };

  let tx: {
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    orgMember: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    dept: { count: jest.Mock };
    role: { count: jest.Mock };
    memberDepartment: { createMany: jest.Mock; deleteMany: jest.Mock };
    memberRole: { createMany: jest.Mock; deleteMany: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let repository: { findDetailById: jest.Mock };
  let service: OrgMemberService;

  beforeEach(() => {
    tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
        update: jest.fn().mockResolvedValue(activeUser),
      },
      orgMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(member),
        update: jest.fn().mockResolvedValue(member),
      },
      dept: { count: jest.fn().mockResolvedValue(0) },
      role: { count: jest.fn().mockResolvedValue(0) },
      memberDepartment: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      memberRole: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<string>) => callback(tx),
      ),
    };
    repository = {
      findDetailById: jest.fn().mockResolvedValue({
        ...member,
        user: {
          id: 'user-1',
          username: null,
          email: 'test@example.com',
          countryCode: null,
          phone: null,
          profile: { displayName: '张三', avatar: null },
        },
        primaryDept: null,
        memberDepartments: [],
        memberRoles: [],
      }),
    };
    service = new OrgMemberService(
      repository as unknown as OrgMemberRepository,
      prisma as unknown as PrismaService,
    );
  });

  it('normalizes an email and creates an unverified user and membership', async () => {
    await service.createMember('org-1', {
      email: ' Test@Example.COM ',
      orgDisplayName: '张三',
    });

    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'test@example.com', mode: 'insensitive' },
      },
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
        passwordHash: null,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
      }),
    });
    expect(tx.orgMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org-1',
        userId: 'user-1',
        status: 'INVITED',
      }),
    });
  });

  it('links an existing phone user and fills only a missing email', async () => {
    tx.user.findUnique.mockResolvedValue({
      ...activeUser,
      countryCode: '+86',
      phone: '13800138000',
    });

    await service.createMember('org-1', {
      email: 'new@example.com',
      countryCode: '86',
      phone: '138 0013 8000',
    });

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ email: 'new@example.com' }),
    });
  });

  it('matches a legacy country code stored without the plus sign', async () => {
    tx.user.findFirst.mockResolvedValueOnce({
      ...activeUser,
      countryCode: '86',
      phone: '13800138000',
    });

    await service.createMember('org-1', {
      countryCode: '+86',
      phone: '13800138000',
    });

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: { countryCode: '86', phone: '13800138000' },
    });
  });

  it('rejects contacts that resolve to different users', async () => {
    tx.user.findFirst.mockResolvedValue({ ...activeUser, id: 'email-user' });
    tx.user.findUnique.mockResolvedValue({ ...activeUser, id: 'phone-user' });

    await expect(
      service.createMember('org-1', {
        email: 'test@example.com',
        countryCode: '+86',
        phone: '13800138000',
      }),
    ).rejects.toThrow('该邮箱和手机号属于不同用户');
  });

  it('does not overwrite a non-empty contact on an existing user', async () => {
    tx.user.findUnique.mockResolvedValue({
      ...activeUser,
      email: 'old@example.com',
      countryCode: '+86',
      phone: '13800138000',
    });

    await expect(
      service.createMember('org-1', {
        email: 'new@example.com',
        countryCode: '+86',
        phone: '13800138000',
      }),
    ).rejects.toThrow('邮箱与已有用户资料不一致');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects a disabled user', async () => {
    tx.user.findFirst.mockResolvedValue({
      ...activeUser,
      email: 'test@example.com',
      active: false,
    });

    await expect(
      service.createMember('org-1', { email: 'test@example.com' }),
    ).rejects.toThrow('匹配到的用户已停用或删除');
  });

  it('rejects an active duplicate membership', async () => {
    tx.user.findFirst.mockResolvedValue({
      ...activeUser,
      email: 'test@example.com',
    });
    tx.orgMember.findUnique.mockResolvedValue(member);

    await expect(
      service.createMember('org-1', { email: 'test@example.com' }),
    ).rejects.toThrow('该用户已是当前组织成员');
  });

  it('restores a soft-deleted member and rebuilds departments and roles', async () => {
    tx.user.findFirst.mockResolvedValue({
      ...activeUser,
      email: 'test@example.com',
    });
    tx.orgMember.findUnique.mockResolvedValue({ ...member, deletedAt: now });
    tx.dept.count.mockResolvedValue(2);
    tx.role.count.mockResolvedValue(1);

    await service.createMember('org-1', {
      email: 'test@example.com',
      primaryDeptId: 'dept-1',
      departmentIds: ['dept-2'],
      roleIds: ['role-1'],
    });

    expect(tx.orgMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: expect.objectContaining({ deletedAt: null, status: 'INVITED' }),
    });
    expect(tx.memberDepartment.deleteMany).toHaveBeenCalledWith({
      where: { memberId: 'member-1' },
    });
    expect(tx.memberDepartment.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ deptId: 'dept-1', isPrimary: true }),
        expect.objectContaining({ deptId: 'dept-2', isPrimary: false }),
      ]),
    });
    expect(tx.memberRole.createMany).toHaveBeenCalled();
  });

  it('retries once after a concurrent unique constraint conflict', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.10.1',
    });
    prisma.$transaction
      .mockRejectedValueOnce(uniqueError)
      .mockImplementationOnce(
        (callback: (client: typeof tx) => Promise<string>) => callback(tx),
      );

    await service.createMember('org-1', { email: 'test@example.com' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('validates that a phone has a country code at the service boundary', async () => {
    await expect(
      service.createMember('org-1', { phone: '13800138000' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('OrgMemberService.batchImportMembers', () => {
  it('keeps partial successes and masks failed contact details', async () => {
    const prisma = {
      $transaction: jest
        .fn()
        .mockResolvedValueOnce('member-1')
        .mockRejectedValueOnce(new ConflictException('该用户已是当前组织成员')),
    };
    const service = new OrgMemberService(
      { findDetailById: jest.fn() } as unknown as OrgMemberRepository,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.batchImportMembers('org-1', {
        members: [
          { email: 'first@example.com' },
          { countryCode: '+86', phone: '13800138000' },
        ],
      }),
    ).resolves.toEqual({
      successCount: 1,
      failureCount: 1,
      failures: [
        {
          index: 1,
          email: undefined,
          phone: '138****8000',
          code: 'CONFLICT',
          reason: '该用户已是当前组织成员',
        },
      ],
    });
  });
});

describe('OrgMemberService.listMembers', () => {
  const repository = {
    findList: jest.fn(),
    getDepartmentIds: jest.fn(),
    findMemberRoleOptions: jest.fn(),
  };
  const service = new OrgMemberService(
    repository as unknown as OrgMemberRepository,
    {} as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findList.mockResolvedValue({ items: [], total: 0 });
  });

  it('combines organization, department, keyword, type and status filters', async () => {
    repository.getDepartmentIds.mockResolvedValue(['dept-1', 'dept-2']);

    await service.listMembers('org-1', {
      page: 2,
      pageSize: 20,
      keyword: 'Alice',
      deptId: 'dept-1',
      includeChildren: true,
      type: 'INTERNAL',
      status: 'ACTIVE',
    });

    expect(repository.getDepartmentIds).toHaveBeenCalledWith(
      'org-1',
      'dept-1',
      true,
    );
    expect(repository.findList).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      where: expect.objectContaining({
        orgId: 'org-1',
        deletedAt: null,
        type: 'INTERNAL',
        status: 'ACTIVE',
        OR: expect.any(Array),
        memberDepartments: {
          some: {
            orgId: 'org-1',
            deptId: { in: ['dept-1', 'dept-2'] },
            deletedAt: null,
          },
        },
      }),
    });
  });

  it('returns lightweight role options without detail lookups', async () => {
    repository.findMemberRoleOptions.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'member-1',
          userId: 'user-1',
          orgDisplayName: null,
          user: {
            username: 'alice',
            email: 'alice@example.com',
            profile: { displayName: 'Alice', avatar: null },
          },
          primaryDept: { name: '研发部' },
          memberDepartments: [{ dept: { name: '研发部' } }],
          memberRoles: [{ roleId: 'role-1' }],
        },
      ],
    });

    await expect(
      service.listMemberRoleOptions('org-1', {
        roleId: 'role-1',
        assignment: 'assigned',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'member-1',
            displayName: 'Alice',
            departmentNames: ['研发部'],
            roleIds: ['role-1'],
          }),
        ],
      }),
    );
    expect(repository.findMemberRoleOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'org-1',
          memberRoles: {
            some: {
              roleId: 'role-1',
              deletedAt: null,
              role: { orgId: 'org-1', deletedAt: null },
            },
          },
        }),
      }),
    );
  });
});
