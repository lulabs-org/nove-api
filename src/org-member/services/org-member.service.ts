import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, OrgMember } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { OrganizationRepository } from '@/org/repositories/organization.repository';
import { MailService } from '@/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { generateRandomToken } from '@/common/utils/random';
import {
  buildInviteEmail,
  buildJoinNotificationEmail,
} from '@/common/email-templates';
import { OrgMemberRepository } from '../repositories/org-member.repository';
import {
  CreateOrgMemberDto,
  UpdateOrgMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberDepartmentsDto,
  BatchImportMemberDto,
  PaginationDto,
  OrgMemberDto,
  OrgMemberDetailDto,
  OrgMemberListResponse,
  BatchImportResponse,
  AddMemberDto,
  AddMemberResponseDto,
} from '../dto';

const DEFAULT_COUNTRY_CODE = '+86';
const INVITATION_EXPIRES_DAYS = 7;

@Injectable()
export class OrgMemberService {
  private readonly logger = new Logger(OrgMemberService.name);

  constructor(
    private readonly orgMemberRepository: OrgMemberRepository,
    private readonly prisma: PrismaService,
    private readonly userQueryRepository: UserQueryRepository,
    private readonly userCommandRepository: UserCommandRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createMember(
    orgId: string,
    dto: CreateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    const existingMember = await this.orgMemberRepository.findByOrgAndUser(
      orgId,
      dto.userId,
    );
    if (existingMember) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    if (dto.employeeNo) {
      const employeeNoExists = await this.orgMemberRepository.findByEmployeeNo(
        orgId,
        dto.employeeNo,
      );
      if (employeeNoExists) {
        throw new BadRequestException('Employee number already exists');
      }
    }

    const member = await this.orgMemberRepository.create({
      org: {
        connect: { id: orgId },
      },
      user: {
        connect: { id: dto.userId },
      },
      type: dto.type || 'INTERNAL',
      orgDisplayName: dto.orgDisplayName,
      employeeNo: dto.employeeNo,
      primaryDept: dto.primaryDeptId
        ? {
            connect: { id: dto.primaryDeptId },
          }
        : undefined,
      externalCompany: dto.externalCompany,
      title: dto.title,
      status: 'PENDING',
    });

    if (dto.departmentIds && dto.departmentIds.length > 0) {
      await this.updateMemberDepartments(member.id, {
        departmentIds: dto.departmentIds,
        primaryDeptId: dto.primaryDeptId,
      });
    }

    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.prisma.memberRole.createMany({
        data: [...new Set(dto.roleIds)].map((roleId) => ({
          memberId: member.id,
          roleId,
        })),
        skipDuplicates: true,
      });
    }

    const memberDetail = await this.orgMemberRepository.findDetailById(
      member.id,
    );
    return this.toDetailDto(memberDetail!);
  }

  /**
   * 添加成员：
   * 1. 校验必填字段、邮箱格式、主部门归属
   * 2. 检查邮箱/手机号是否已注册
   *    - 已存在 → 关联已有用户，不创建新用户、不发邀请链接
   *    - 不存在 → 创建新用户（无密码、无 username），生成邀请令牌
   * 3. 校验用户是否已是组织成员
   * 4. 事务内：创建成员（status = PENDING）+ 绑定部门 + 绑定角色
   * 5. 发送邮件通知（新用户含邀请链接；失败不阻塞，返回 emailSent=false）
   */
  async addMember(
    orgId: string,
    dto: AddMemberDto,
  ): Promise<AddMemberResponseDto> {
    // 1. 校验主部门必须在部门列表中
    if (!dto.departmentIds.includes(dto.primaryDeptId)) {
      throw new BadRequestException('主部门必须在所选部门中');
    }

    // 2. 校验部门存在且属于当前组织
    const departments = await this.prisma.dept.findMany({
      where: {
        id: { in: dto.departmentIds },
        orgId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (departments.length !== dto.departmentIds.length) {
      throw new BadRequestException('部门不存在或不属于当前组织');
    }

    // 3. 解析姓名、邮箱、手机号
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const countryCode = (dto.countryCode || DEFAULT_COUNTRY_CODE).trim();
    const phone = dto.phone.trim();

    // 4. 检查邮箱/手机号是否已注册（新用户走邮箱验证码登录，不生成 username/密码）
    let existingUser = await this.userQueryRepository.byEmail(email);
    if (!existingUser) {
      existingUser = await this.userQueryRepository.byPhone(countryCode, phone);
    }

    const isNewUser = !existingUser;
    let userId: string;
    let invitationToken: string | undefined;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 生成邀请令牌（7 天有效），用户接受邀请后通过邮箱验证码登录
      invitationToken = generateRandomToken(32);
      const invitationExpiresAt = new Date(
        Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      );

      const newUser = await this.userCommandRepository.createWithProfile({
        email,
        phone,
        countryCode,
        password: null,
        profileName: name,
        invitationToken,
        invitationExpiresAt,
      });
      userId = newUser.id;
    }

    // 5. 校验用户是否已是组织成员
    const existingMember = await this.orgMemberRepository.findByOrgAndUser(
      orgId,
      userId,
    );
    if (existingMember) {
      throw new BadRequestException('该用户已是组织成员');
    }

    // 6. 事务内创建成员（status = PENDING）+ 绑定部门 + 绑定角色
    const uniqueDeptIds = [...new Set(dto.departmentIds)];
    const uniqueRoleIds =
      dto.roleIds && dto.roleIds.length > 0 ? [...new Set(dto.roleIds)] : [];

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orgMember.create({
        data: {
          org: { connect: { id: orgId } },
          user: { connect: { id: userId } },
          type: dto.type || 'INTERNAL',
          orgDisplayName: name,
          primaryDept: { connect: { id: dto.primaryDeptId } },
          title: dto.title?.trim() || undefined,
          status: 'PENDING',
        },
      });

      // 覆盖式写入部门关系，并标记主部门
      await tx.memberDepartment.deleteMany({ where: { memberId: created.id } });
      for (const deptId of uniqueDeptIds) {
        await tx.memberDepartment.create({
          data: {
            memberId: created.id,
            deptId,
            orgId,
            isPrimary: deptId === dto.primaryDeptId,
          },
        });
      }
      await tx.orgMember.update({
        where: { id: created.id },
        data: { primaryDeptId: dto.primaryDeptId },
      });

      // 绑定角色关系
      if (uniqueRoleIds.length > 0) {
        await tx.memberRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({
            memberId: created.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    // 7. 获取成员详情
    const memberDetail = await this.orgMemberRepository.findDetailById(
      member.id,
    );
    const memberDto = this.toDetailDto(memberDetail!);

    // 8. 发送邮件通知（失败不阻塞业务）
    const emailSent = await this.sendInviteEmail({
      orgId,
      name,
      email,
      isNewUser,
      invitationToken,
      memberId: member.id,
      memberEmail: existingUser?.email || email,
    });

    return {
      member: memberDto,
      isNewUser,
      emailSent,
    };
  }

  /**
   * 接受组织邀请：校验成员状态、令牌与有效期，将成员 PENDING → AGREED，
   * 并清除用户邀请令牌、标记邮箱已验证与接受时间。
   */
  async acceptInvitation(memberId: string, token: string): Promise<void> {
    const member = await this.orgMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('成员不存在');
    }
    if (member.status !== 'PENDING') {
      throw new BadRequestException('该邀请已处理或不可接受');
    }

    const user = await this.userQueryRepository.byId(member.userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.invitationToken || user.invitationToken !== token) {
      throw new BadRequestException('邀请令牌无效');
    }
    if (
      !user.invitationExpiresAt ||
      user.invitationExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('邀请已过期');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orgMember.update({
        where: { id: memberId },
        data: { status: 'AGREED' },
      });
      await this.userCommandRepository.acceptInvitation(user.id, tx);
    });
  }

  /**
   * 发送邀请邮件。新用户发含邀请链接的邮件，已有用户发加入通知邮件。
   * 失败时记录日志并返回 false，不抛出异常。
   */
  private async sendInviteEmail(args: {
    orgId: string;
    name: string;
    email: string;
    isNewUser: boolean;
    invitationToken?: string;
    memberId?: string;
    memberEmail: string | null;
  }): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const org = await this.organizationRepository.findById(args.orgId);
    const orgName = org?.name || '组织';
    const targetEmail = args.memberEmail || args.email;

    const emailData = {
      name: args.name,
      orgName,
      email: targetEmail,
      invitationToken: args.isNewUser ? args.invitationToken : undefined,
      memberId: args.isNewUser ? args.memberId : undefined,
      frontendUrl,
    };

    const { subject, html } = args.isNewUser
      ? buildInviteEmail(emailData)
      : buildJoinNotificationEmail(emailData);

    try {
      await this.mailService.sendSimpleEmail({
        to: targetEmail,
        subject,
        html,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `邀请邮件发送失败: ${targetEmail} - ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async listMembers(
    orgId: string,
    pagination?: PaginationDto,
  ): Promise<OrgMemberListResponse> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    let result: { items: OrgMember[]; total: number };

    if (pagination?.keyword) {
      result = await this.orgMemberRepository.searchByKeyword(
        orgId,
        pagination.keyword,
        { skip, take: pageSize },
      );
    } else if (pagination?.deptId) {
      const includeChildren = pagination?.includeChildren || false;
      result = await this.orgMemberRepository.findByDepartmentId(
        pagination.deptId,
        includeChildren,
        { skip, take: pageSize },
      );
    } else {
      const where: Prisma.OrgMemberWhereInput = {};

      if (pagination?.type) {
        where.type = pagination.type;
      }

      if (pagination?.status) {
        where.status = pagination.status;
      }

      result = await this.orgMemberRepository.findByOrgId(orgId, {
        skip,
        take: pageSize,
        where,
      });
    }

    return {
      items: result.items.map((item) => this.toDto(item)),
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  async getMember(memberId: string): Promise<OrgMemberDetailDto> {
    const member = await this.orgMemberRepository.findDetailById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.toDetailDto(member);
  }

  async updateMember(
    memberId: string,
    dto: UpdateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    const member = await this.orgMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (dto.employeeNo && dto.employeeNo !== member.employeeNo) {
      const employeeNoExists = await this.orgMemberRepository.findByEmployeeNo(
        member.orgId,
        dto.employeeNo,
      );
      if (employeeNoExists) {
        throw new BadRequestException('Employee number already exists');
      }
    }

    const updatedMember = await this.orgMemberRepository.update(memberId, {
      type: dto.type,
      orgDisplayName: dto.orgDisplayName,
      employeeNo: dto.employeeNo,
      primaryDept: dto.primaryDeptId
        ? {
            connect: { id: dto.primaryDeptId },
          }
        : undefined,
      externalCompany: dto.externalCompany,
      title: dto.title,
      joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
    });

    const memberDetail = await this.orgMemberRepository.findDetailById(
      updatedMember.id,
    );
    return this.toDetailDto(memberDetail!);
  }

  async updateMemberStatus(
    memberId: string,
    dto: UpdateMemberStatusDto,
  ): Promise<OrgMemberDetailDto> {
    const member = await this.orgMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const updatedMember = await this.orgMemberRepository.updateStatus(
      memberId,
      dto.status,
    );

    const memberDetail = await this.orgMemberRepository.findDetailById(
      updatedMember.id,
    );
    return this.toDetailDto(memberDetail!);
  }

  async deleteMember(memberId: string): Promise<void> {
    const member = await this.orgMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.orgMemberRepository.softDelete(memberId);
  }

  async updateMemberDepartments(
    memberId: string,
    dto: UpdateMemberDepartmentsDto,
  ): Promise<OrgMemberDetailDto> {
    const member = await this.orgMemberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const { departmentIds, primaryDeptId, append } = dto;

    if (departmentIds !== undefined) {
      const currentDepts = await this.prisma.memberDepartment.findMany({
        where: { memberId, deletedAt: null },
        select: { deptId: true },
      });

      const currentDeptIds = currentDepts.map((d) => d.deptId);

      let deptIdsToProcess: string[];

      if (append) {
        deptIdsToProcess = [...new Set([...currentDeptIds, ...departmentIds])];
      } else {
        deptIdsToProcess = departmentIds;
      }

      const finalPrimaryDeptId = primaryDeptId || member.primaryDeptId;

      if (
        finalPrimaryDeptId &&
        !deptIdsToProcess.includes(finalPrimaryDeptId)
      ) {
        throw new BadRequestException(
          'Primary department must be included in departmentIds',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.memberDepartment.deleteMany({
          where: { memberId },
        });

        for (const deptId of deptIdsToProcess) {
          await tx.memberDepartment.create({
            data: {
              memberId,
              deptId,
              orgId: member.orgId,
              isPrimary: deptId === finalPrimaryDeptId,
            },
          });
        }

        await tx.orgMember.update({
          where: { id: memberId },
          data: { primaryDeptId: finalPrimaryDeptId || null },
        });
      });
    }

    const memberDetail =
      await this.orgMemberRepository.findDetailById(memberId);
    return this.toDetailDto(memberDetail!);
  }

  async batchImportMembers(
    orgId: string,
    dto: BatchImportMemberDto,
  ): Promise<BatchImportResponse> {
    const failures: Array<{ userId: string; reason: string }> = [];
    let successCount = 0;

    for (const memberData of dto.members) {
      try {
        const existingMember = await this.orgMemberRepository.findByOrgAndUser(
          orgId,
          memberData.userId,
        );
        if (existingMember) {
          failures.push({
            userId: memberData.userId,
            reason: 'User is already a member of this organization',
          });
          continue;
        }

        if (memberData.employeeNo) {
          const employeeNoExists =
            await this.orgMemberRepository.findByEmployeeNo(
              orgId,
              memberData.employeeNo,
            );
          if (employeeNoExists) {
            failures.push({
              userId: memberData.userId,
              reason: 'Employee number already exists',
            });
            continue;
          }
        }

        await this.orgMemberRepository.create({
          org: {
            connect: { id: orgId },
          },
          user: {
            connect: { id: memberData.userId },
          },
          type: 'INTERNAL',
          orgDisplayName: memberData.orgDisplayName,
          employeeNo: memberData.employeeNo,
          primaryDept: memberData.primaryDeptId
            ? {
                connect: { id: memberData.primaryDeptId },
              }
            : undefined,
          title: memberData.title,
          status: 'PENDING',
        });

        successCount++;
      } catch (error) {
        failures.push({
          userId: memberData.userId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  private toDto(
    member: OrgMember & {
      user?: {
        id: string;
        username: string | null;
        email: string | null;
        profile?: {
          displayName: string | null;
          avatar: string | null;
        } | null;
      };
      primaryDept?: {
        id: string;
        name: string;
        code: string;
      } | null;
    },
  ): OrgMemberDto {
    return {
      id: member.id,
      orgId: member.orgId,
      userId: member.userId,
      type: member.type,
      status: member.status,
      orgDisplayName: member.orgDisplayName,
      employeeNo: member.employeeNo,
      primaryDeptId: member.primaryDeptId,
      externalCompany: member.externalCompany,
      title: member.title,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      deletedAt: member.deletedAt,
      user: member.user,
      primaryDept: member.primaryDept,
    };
  }

  private toDetailDto(
    member: OrgMember & {
      user?: {
        id: string;
        username: string | null;
        email: string | null;
        profile?: {
          displayName: string | null;
          avatar: string | null;
        } | null;
      };
      primaryDept?: {
        id: string;
        name: string;
        code: string;
      };
      memberDepartments?: Array<{
        dept: {
          id: string;
          name: string;
          code: string;
        };
        isPrimary: boolean;
      }>;
      memberRoles?: Array<{
        role: {
          id: string;
          name: string;
          code: string;
        };
      }>;
    },
  ): OrgMemberDetailDto {
    return {
      ...this.toDto(member),
      user: member.user || {
        id: '',
        username: null,
        email: null,
        profile: null,
      },
      primaryDept: member.primaryDept,
      departments:
        member.memberDepartments?.map((md) => ({
          id: md.dept.id,
          name: md.dept.name,
          code: md.dept.code,
          isPrimary: md.isPrimary,
        })) || [],
      roles:
        member.memberRoles?.map((mr) => ({
          id: mr.role.id,
          name: mr.role.name,
          code: mr.role.code,
        })) || [],
    };
  }
}
