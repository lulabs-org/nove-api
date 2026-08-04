import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgMemberService } from './org-member.service';
import { OrgMemberRepository } from '../repositories/org-member.repository';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { OrganizationRepository } from '@/org/repositories/organization.repository';
import { MailService } from '@/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AddMemberDto } from '../dto';

/* eslint-disable @typescript-eslint/unbound-method */

describe('OrgMemberService - addMember', () => {
  let service: OrgMemberService;
  let orgMemberRepository: jest.Mocked<OrgMemberRepository>;
  let userQueryRepository: jest.Mocked<UserQueryRepository>;
  let userCommandRepository: jest.Mocked<UserCommandRepository>;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let mailService: jest.Mocked<MailService>;
  let prisma: {
    dept: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    orgMember: { create: jest.Mock; update: jest.Mock };
    memberDepartment: { deleteMany: jest.Mock; create: jest.Mock };
    memberRole: { createMany: jest.Mock };
  };

  const orgId = 'org-1';
  const primaryDeptId = 'dept-1';
  const otherDeptId = 'dept-2';

  const baseDto: AddMemberDto = {
    name: 'Alice',
    phone: '13800138000',
    countryCode: '+86',
    email: 'alice@example.com',
    departmentIds: [primaryDeptId, otherDeptId],
    primaryDeptId,
    type: 'INTERNAL',
    title: '工程师',
    roleIds: ['role-1'],
  };

  const createdMember = {
    id: 'member-1',
    orgId,
    userId: 'user-1',
    type: 'INTERNAL' as const,
    status: 'PENDING' as const,
    orgDisplayName: 'Alice',
    employeeNo: null,
    primaryDeptId,
    externalCompany: null,
    title: '工程师',
    invitationToken: null,
    invitationExpiresAt: null,
    invitationAcceptedAt: null,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const memberDetail = {
    ...createdMember,
    user: {
      id: 'user-1',
      username: null,
      email: 'alice@example.com',
      profile: { displayName: 'Alice', avatar: null },
    },
    primaryDept: { id: primaryDeptId, name: '技术部', code: 'TECH' },
    memberDepartments: [
      {
        dept: { id: primaryDeptId, name: '技术部', code: 'TECH' },
        isPrimary: true,
      },
      {
        dept: { id: otherDeptId, name: '产品部', code: 'PM' },
        isPrimary: false,
      },
    ],
    memberRoles: [{ role: { id: 'role-1', name: '管理员', code: 'ADMIN' } }],
  };

  beforeEach(async () => {
    tx = {
      orgMember: {
        create: jest.fn().mockResolvedValue(createdMember),
        update: jest.fn().mockResolvedValue(createdMember),
      },
      memberDepartment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      memberRole: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prisma = {
      dept: { findMany: jest.fn() },
      $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) =>
        cb(tx),
      ),
    };

    orgMemberRepository = {
      create: jest.fn().mockResolvedValue(createdMember),
      findByOrgAndUser: jest.fn().mockResolvedValue(null),
      findByEmployeeNo: jest.fn().mockResolvedValue(null),
      findDetailById: jest.fn().mockResolvedValue(memberDetail),
      findById: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn().mockResolvedValue(createdMember),
      acceptInvitation: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OrgMemberRepository>;

    userQueryRepository = {
      byEmail: jest.fn().mockResolvedValue(null),
      byPhone: jest.fn().mockResolvedValue(null),
      byId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<UserQueryRepository>;

    userCommandRepository = {
      createWithProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        username: null,
        email: 'alice@example.com',
        profile: { displayName: 'Alice', avatar: null },
        orgMembers: [],
      }),
      markEmailVerified: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserCommandRepository>;

    organizationRepository = {
      findById: jest.fn().mockResolvedValue({ id: orgId, name: 'LuLab' }),
    } as unknown as jest.Mocked<OrganizationRepository>;

    mailService = {
      sendSimpleEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MailService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgMemberService,
        { provide: OrgMemberRepository, useValue: orgMemberRepository },
        { provide: UserQueryRepository, useValue: userQueryRepository },
        { provide: UserCommandRepository, useValue: userCommandRepository },
        { provide: OrganizationRepository, useValue: organizationRepository },
        { provide: MailService, useValue: mailService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') },
        },
      ],
    }).compile();

    service = module.get(OrgMemberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when primaryDeptId is not in departmentIds', async () => {
    await expect(
      service.addMember(orgId, {
        ...baseDto,
        departmentIds: [otherDeptId],
        primaryDeptId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when some departments do not exist in the org', async () => {
    prisma.dept.findMany.mockResolvedValue([{ id: primaryDeptId }]);
    await expect(service.addMember(orgId, baseDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when the email is already registered', async () => {
    prisma.dept.findMany.mockResolvedValue([
      { id: primaryDeptId },
      { id: otherDeptId },
    ]);
    userQueryRepository.byEmail.mockResolvedValue({
      id: 'user-existing',
      email: 'alice@example.com',
    } as never);

    await expect(service.addMember(orgId, baseDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(userCommandRepository.createWithProfile).not.toHaveBeenCalled();
  });

  it('throws when the phone is already registered', async () => {
    prisma.dept.findMany.mockResolvedValue([
      { id: primaryDeptId },
      { id: otherDeptId },
    ]);
    userQueryRepository.byPhone.mockResolvedValue({
      id: 'user-by-phone',
      phone: '13800138000',
    } as never);

    await expect(service.addMember(orgId, baseDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(userCommandRepository.createWithProfile).not.toHaveBeenCalled();
  });

  it('creates a new user, member, and sends an invite email with invite link', async () => {
    prisma.dept.findMany.mockResolvedValue([
      { id: primaryDeptId },
      { id: otherDeptId },
    ]);

    const result = await service.addMember(orgId, baseDto);

    // New user created without username/password and without invitation fields
    // (invitation lifecycle now lives on OrgMember)
    expect(userCommandRepository.createWithProfile).toHaveBeenCalledTimes(1);
    const createArg = userCommandRepository.createWithProfile.mock.calls[0][0];
    expect(createArg.username).toBeUndefined();
    expect(createArg.email).toBe('alice@example.com');
    expect(createArg.phone).toBe('13800138000');
    expect(createArg.countryCode).toBe('+86');
    expect(createArg.profileName).toBe('Alice');
    expect(createArg.password).toBeNull();

    // Member created in transaction with PENDING status and invitation token
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.orgMember.create).toHaveBeenCalledTimes(1);
    const memberInput = (
      tx.orgMember.create.mock.calls as {
        data: {
          status: string;
          orgDisplayName: string;
          employeeNo?: string | null;
          invitationToken: string;
          invitationExpiresAt: Date;
        };
      }[][]
    )[0][0].data;
    expect(memberInput.status).toBe('PENDING');
    expect(memberInput.orgDisplayName).toBe('Alice');
    expect(memberInput.employeeNo).toBeUndefined();
    expect(typeof memberInput.invitationToken).toBe('string');
    expect(memberInput.invitationToken).not.toBe('');
    expect(memberInput.invitationExpiresAt).toBeInstanceOf(Date);

    // Departments bound (create per dept, no deleteMany on new member)
    expect(tx.memberDepartment.deleteMany).not.toHaveBeenCalled();
    expect(tx.memberDepartment.create).toHaveBeenCalledTimes(2);

    // Roles bound
    expect(tx.memberRole.createMany).toHaveBeenCalledWith({
      data: [{ memberId: 'member-1', roleId: 'role-1' }],
      skipDuplicates: true,
    });

    // Email sent with invite link (no plaintext password)
    expect(mailService.sendSimpleEmail).toHaveBeenCalledTimes(1);
    const emailArg = mailService.sendSimpleEmail.mock.calls[0][0];
    expect(emailArg.to).toBe('alice@example.com');
    expect(emailArg.subject).toContain('邀请');
    expect(emailArg.html).toContain('/invite/accept');
    expect(emailArg.html).toContain('7 天内有效');
    expect(emailArg.html).not.toContain('初始密码');

    // Response
    expect(result.emailSent).toBe(true);
    expect(result.member.id).toBe('member-1');
  });

  it('returns emailSent=false when sending the email throws', async () => {
    prisma.dept.findMany.mockResolvedValue([
      { id: primaryDeptId },
      { id: otherDeptId },
    ]);
    mailService.sendSimpleEmail.mockRejectedValue(new Error('SMTP down'));

    const result = await service.addMember(orgId, baseDto);

    expect(result.emailSent).toBe(false);
    // Member was still created
    expect(tx.orgMember.create).toHaveBeenCalledTimes(1);
  });

  describe('acceptInvitation', () => {
    const memberId = 'member-1';
    const userId = 'user-1';
    const token = 'valid-token';
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    it('transitions member PENDING → AGREED and marks user email verified', async () => {
      orgMemberRepository.findById.mockResolvedValue({
        ...createdMember,
        status: 'PENDING',
        userId,
        invitationToken: token,
        invitationExpiresAt: futureDate,
      } as never);

      await service.acceptInvitation(memberId, token);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(orgMemberRepository.acceptInvitation).toHaveBeenCalledWith(
        memberId,
        tx,
      );
      expect(userCommandRepository.markEmailVerified).toHaveBeenCalledWith(
        userId,
        tx,
      );
    });

    it('throws when the member does not exist', async () => {
      orgMemberRepository.findById.mockResolvedValue(null);

      await expect(service.acceptInvitation(memberId, token)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the member is not in PENDING status', async () => {
      orgMemberRepository.findById.mockResolvedValue({
        ...createdMember,
        status: 'AGREED',
        userId,
        invitationToken: token,
        invitationExpiresAt: futureDate,
      } as never);

      await expect(service.acceptInvitation(memberId, token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the token does not match', async () => {
      orgMemberRepository.findById.mockResolvedValue({
        ...createdMember,
        status: 'PENDING',
        userId,
        invitationToken: 'different-token',
        invitationExpiresAt: futureDate,
      } as never);

      await expect(service.acceptInvitation(memberId, token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when the invitation has expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      orgMemberRepository.findById.mockResolvedValue({
        ...createdMember,
        status: 'PENDING',
        userId,
        invitationToken: token,
        invitationExpiresAt: pastDate,
      } as never);

      await expect(service.acceptInvitation(memberId, token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
