import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, OrgMember } from '@prisma/client';
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
} from '../dto';

@Injectable()
export class OrgMemberService {
  constructor(private readonly orgMemberRepository: OrgMemberRepository) {}

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
      status: 'INVITED',
    });

    if (dto.departmentIds && dto.departmentIds.length > 0) {
      await this.updateMemberDepartments(member.id, {
        departmentIds: dto.departmentIds,
        primaryDeptId: dto.primaryDeptId,
      });
    }

    const memberDetail = await this.orgMemberRepository.findDetailById(
      member.id,
    );
    return this.toDetailDto(memberDetail!);
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

    if (departmentIds && departmentIds.length > 0) {
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

      await this.prisma.$transaction(async (tx) => {
        await tx.memberDepartment.deleteMany({
          where: { memberId },
        });

        for (const deptId of deptIdsToProcess) {
          await tx.memberDepartment.create({
            data: {
              memberId,
              deptId,
              isPrimary: deptId === finalPrimaryDeptId,
            },
          });
        }

        if (finalPrimaryDeptId) {
          await tx.orgMember.update({
            where: { id: memberId },
            data: { primaryDeptId: finalPrimaryDeptId },
          });
        }
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
          status: 'INVITED',
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

  private toDto(member: OrgMember): OrgMemberDto {
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

  private get prisma() {
    return this.orgMemberRepository['prisma'];
  }
}
