import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { Prisma, OrgMember } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { OrgMemberRepository } from '../repositories/org-member.repository';
import {
  CreateOrgMemberDto,
  UpdateOrgMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberDepartmentsDto,
  BatchImportMemberDto,
  PaginationDto,
  MemberRoleOptionQueryDto,
  OrgMemberListItemDto,
  OrgMemberDetailDto,
  OrgMemberListResponse,
  MemberRoleOptionListResponse,
  BatchImportResponse,
} from '../dto';
import { DesensitizationUtil } from '@/common/utils/desensitization.util';
import type { OrgMemberListRecord } from '../repositories/org-member.repository';

@Injectable()
export class OrgMemberService {
  constructor(
    private readonly orgMemberRepository: OrgMemberRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createMember(
    orgId: string,
    dto: CreateOrgMemberDto,
  ): Promise<OrgMemberDetailDto> {
    const memberId = await this.createMemberWithRetry(orgId, dto);

    const memberDetail =
      await this.orgMemberRepository.findDetailById(memberId);
    return this.toDetailDto(memberDetail!);
  }

  async listMembers(
    orgId: string,
    pagination?: PaginationDto,
  ): Promise<OrgMemberListResponse> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrgMemberWhereInput = { orgId, deletedAt: null };
    if (pagination?.type) where.type = pagination.type;
    if (pagination?.status) where.status = pagination.status;
    if (pagination?.keyword) {
      where.OR = [
        {
          orgDisplayName: { contains: pagination.keyword, mode: 'insensitive' },
        },
        { employeeNo: { contains: pagination.keyword, mode: 'insensitive' } },
        {
          user: {
            username: { contains: pagination.keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: pagination.keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            profile: {
              displayName: {
                contains: pagination.keyword,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }
    if (pagination?.deptId) {
      const departmentIds = await this.orgMemberRepository.getDepartmentIds(
        orgId,
        pagination.deptId,
        pagination.includeChildren || false,
      );
      where.memberDepartments = {
        some: { orgId, deptId: { in: departmentIds }, deletedAt: null },
      };
    }

    const result = await this.orgMemberRepository.findList({
      skip,
      take: pageSize,
      where,
    });

    return {
      items: result.items.map((item) => this.toDto(item)),
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  async listMemberRoleOptions(
    orgId: string,
    query: MemberRoleOptionQueryDto,
  ): Promise<MemberRoleOptionListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Prisma.OrgMemberWhereInput = { orgId, deletedAt: null };
    if (query.keyword) {
      where.OR = [
        { orgDisplayName: { contains: query.keyword, mode: 'insensitive' } },
        {
          user: { username: { contains: query.keyword, mode: 'insensitive' } },
        },
        { user: { email: { contains: query.keyword, mode: 'insensitive' } } },
        {
          user: {
            profile: {
              displayName: { contains: query.keyword, mode: 'insensitive' },
            },
          },
        },
      ];
    }
    if (query.roleId && query.assignment) {
      where.memberRoles = {
        [query.assignment === 'assigned' ? 'some' : 'none']: {
          roleId: query.roleId,
          deletedAt: null,
          role: { orgId, deletedAt: null },
        },
      };
    }
    const result = await this.orgMemberRepository.findMemberRoleOptions({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    });
    return {
      items: result.items.map((member) => ({
        id: member.id,
        userId: member.userId,
        displayName:
          member.orgDisplayName ||
          member.user.profile?.displayName ||
          member.user.username ||
          member.user.email,
        email: member.user.email,
        avatar: member.user.profile?.avatar || null,
        departmentNames: [
          ...new Set([
            ...(member.primaryDept?.name ? [member.primaryDept.name] : []),
            ...member.memberDepartments.map((item) => item.dept.name),
          ]),
        ],
        roleIds: member.memberRoles.map((item) => item.roleId),
      })),
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
    const failures: BatchImportResponse['failures'] = [];
    let successCount = 0;

    for (const [index, memberData] of dto.members.entries()) {
      try {
        await this.createMemberWithRetry(orgId, memberData);
        successCount++;
      } catch (error) {
        failures.push({
          index,
          email: DesensitizationUtil.maskEmail(memberData.email),
          phone: DesensitizationUtil.maskPhone(memberData.phone),
          code: this.getFailureCode(error),
          reason: this.getErrorMessage(error),
        });
      }
    }

    return {
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  private async createMemberWithRetry(
    orgId: string,
    dto: CreateOrgMemberDto,
  ): Promise<string> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.prisma.$transaction((tx) =>
          this.createMemberInTransaction(tx, orgId, dto),
        );
      } catch (error) {
        const isUniqueConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (isUniqueConflict && attempt === 0) {
          continue;
        }

        if (isUniqueConflict) {
          throw new ConflictException('用户联系方式或组织成员关系已存在');
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003'
        ) {
          throw new BadRequestException('组织、部门或角色不存在');
        }

        throw error;
      }
    }

    throw new ConflictException('成员创建发生并发冲突，请重试');
  }

  private async createMemberInTransaction(
    tx: Prisma.TransactionClient,
    orgId: string,
    dto: CreateOrgMemberDto,
  ): Promise<string> {
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);
    const countryCode = phone
      ? this.normalizeCountryCode(dto.countryCode)
      : undefined;

    if (!email && !phone) {
      throw new BadRequestException('手机号与邮箱至少填写一个');
    }
    if (phone && !countryCode) {
      throw new BadRequestException('填写手机号时必须提供国家代码');
    }

    const [emailUser, phoneUser] = await Promise.all([
      email
        ? tx.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          })
        : null,
      phone && countryCode
        ? this.findUserByPhone(tx, countryCode, phone)
        : null,
    ]);

    if (emailUser && phoneUser && emailUser.id !== phoneUser.id) {
      throw new ConflictException('该邮箱和手机号属于不同用户');
    }

    const existingUser = emailUser ?? phoneUser;
    let userId: string;

    if (existingUser) {
      if (!existingUser.active || existingUser.deletedAt) {
        throw new ConflictException('匹配到的用户已停用或删除');
      }

      const existingEmail = this.normalizeEmail(existingUser.email);
      if (email && existingEmail && email !== existingEmail) {
        throw new ConflictException('邮箱与已有用户资料不一致');
      }

      const existingPhone = this.normalizePhone(existingUser.phone);
      const existingCountryCode = existingPhone
        ? this.normalizeCountryCode(existingUser.countryCode)
        : undefined;
      if (
        phone &&
        existingPhone &&
        (phone !== existingPhone || countryCode !== existingCountryCode)
      ) {
        throw new ConflictException('手机号与已有用户资料不一致');
      }

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          ...(!existingEmail && email ? { email } : {}),
          ...(!existingPhone && phone && countryCode
            ? { phone, countryCode }
            : {}),
          profile: {
            upsert: {
              create: { displayName: dto.orgDisplayName ?? null },
              update: {},
            },
          },
        },
      });
      userId = existingUser.id;
    } else {
      const user = await tx.user.create({
        data: {
          email: email ?? null,
          phone: phone ?? null,
          countryCode: countryCode ?? null,
          passwordHash: null,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          profile: {
            create: { displayName: dto.orgDisplayName ?? null },
          },
        },
      });
      userId = user.id;
    }

    const existingMember = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });

    if (existingMember && !existingMember.deletedAt) {
      throw new ConflictException('该用户已是当前组织成员');
    }

    if (dto.employeeNo) {
      const employeeNoExists = await tx.orgMember.findFirst({
        where: {
          orgId,
          employeeNo: dto.employeeNo,
          deletedAt: null,
          ...(existingMember ? { id: { not: existingMember.id } } : {}),
        },
      });
      if (employeeNoExists) {
        throw new ConflictException('工号已存在');
      }
    }

    const departmentIds = [
      ...new Set([
        ...(dto.departmentIds ?? []),
        ...(dto.primaryDeptId ? [dto.primaryDeptId] : []),
      ]),
    ];
    const roleIds = [...new Set(dto.roleIds ?? [])];

    if (departmentIds.length > 0) {
      const departmentCount = await tx.dept.count({
        where: {
          id: { in: departmentIds },
          orgId,
          deletedAt: null,
        },
      });
      if (departmentCount !== departmentIds.length) {
        throw new BadRequestException('包含不存在或不属于当前组织的部门');
      }
    }

    if (roleIds.length > 0) {
      const roleCount = await tx.role.count({
        where: {
          id: { in: roleIds },
          orgId,
          isDeleted: false,
          deletedAt: null,
        },
      });
      if (roleCount !== roleIds.length) {
        throw new BadRequestException('包含不存在或不属于当前组织的角色');
      }
    }

    const member = existingMember
      ? await tx.orgMember.update({
          where: { id: existingMember.id },
          data: {
            type: dto.type ?? 'INTERNAL',
            status: 'INVITED',
            orgDisplayName: dto.orgDisplayName ?? null,
            employeeNo: dto.employeeNo ?? null,
            primaryDeptId: dto.primaryDeptId ?? null,
            externalCompany: dto.externalCompany ?? null,
            title: dto.title ?? null,
            deletedAt: null,
          },
        })
      : await tx.orgMember.create({
          data: {
            orgId,
            userId,
            type: dto.type ?? 'INTERNAL',
            status: 'INVITED',
            orgDisplayName: dto.orgDisplayName,
            employeeNo: dto.employeeNo,
            primaryDeptId: dto.primaryDeptId,
            externalCompany: dto.externalCompany,
            title: dto.title,
          },
        });

    if (existingMember) {
      await Promise.all([
        tx.memberDepartment.deleteMany({ where: { memberId: member.id } }),
        tx.memberRole.deleteMany({ where: { memberId: member.id } }),
      ]);
    }

    if (departmentIds.length > 0) {
      await tx.memberDepartment.createMany({
        data: departmentIds.map((deptId) => ({
          memberId: member.id,
          deptId,
          orgId,
          isPrimary: deptId === dto.primaryDeptId,
        })),
      });
    }

    if (roleIds.length > 0) {
      await tx.memberRole.createMany({
        data: roleIds.map((roleId) => ({ memberId: member.id, roleId })),
      });
    }

    return member.id;
  }

  private async findUserByPhone(
    tx: Prisma.TransactionClient,
    countryCode: string,
    phone: string,
  ) {
    const exactUser = await tx.user.findUnique({
      where: {
        uq_users_country_code_phone: { countryCode, phone },
      },
    });
    if (exactUser) return exactUser;

    return tx.user.findFirst({
      where: {
        countryCode: countryCode.slice(1),
        phone,
      },
    });
  }

  private normalizeEmail(email?: string | null): string | undefined {
    const normalized = email?.trim().toLowerCase();
    return normalized || undefined;
  }

  private normalizePhone(phone?: string | null): string | undefined {
    const normalized = phone?.replace(/\D/g, '');
    if (!normalized) return undefined;
    if (normalized.length > 20) {
      throw new BadRequestException('手机号格式不正确');
    }
    return normalized;
  }

  private normalizeCountryCode(
    countryCode?: string | null,
  ): string | undefined {
    const digits = countryCode?.replace(/\D/g, '');
    return digits ? `+${digits}` : undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      const message = (response as { message?: string | string[] }).message;
      return Array.isArray(message)
        ? message.join('; ')
        : message || error.message;
    }
    return error instanceof Error ? error.message : '未知错误';
  }

  private getFailureCode(error: unknown): string {
    if (error instanceof ConflictException) return 'CONFLICT';
    if (error instanceof BadRequestException) return 'INVALID_REQUEST';
    if (error instanceof NotFoundException) return 'NOT_FOUND';
    return 'INTERNAL_ERROR';
  }

  private toDto(member: OrgMemberListRecord): OrgMemberListItemDto {
    return {
      id: member.id,
      userId: member.userId,
      type: member.type,
      status: member.status,
      orgDisplayName: member.orgDisplayName,
      employeeNo: member.employeeNo,
      title: member.title,
      joinedAt: member.joinedAt,
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
        countryCode: string | null;
        phone: string | null;
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
      user: member.user || {
        id: '',
        username: null,
        email: null,
        countryCode: null,
        phone: null,
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
