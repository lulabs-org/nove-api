import { Injectable } from '@nestjs/common';
import {
  DriveAction,
  DriveAuditAction,
  DriveGrantEffect,
  DrivePrincipalType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DriveAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(orgId: string, userId: string) {
    return this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      select: { status: true, deletedAt: true },
    });
  }

  findPrincipalMembership(orgId: string, userId: string) {
    return this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      select: {
        id: true,
        primaryDeptId: true,
        memberRoles: {
          where: { deletedAt: null },
          select: { roleId: true },
        },
        memberDepartments: {
          where: { deletedAt: null },
          select: { deptId: true },
        },
      },
    });
  }

  findApplicableGrants(options: {
    spaceId: string;
    nodeIds: string[];
    principals: Array<{ type: DrivePrincipalType; id: string }>;
    action: DriveAction;
  }) {
    return this.prisma.driveGrant.findMany({
      where: {
        spaceId: options.spaceId,
        AND: [
          { OR: [{ nodeId: null }, { nodeId: { in: options.nodeIds } }] },
          {
            OR: options.principals.map((principal) => ({
              principalType: principal.type,
              principalId: principal.id,
            })),
          },
        ],
        actions: { has: options.action },
      },
    });
  }

  listNodeGrants(nodeId: string) {
    return this.prisma.driveGrant.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  listSpaceGrants(spaceId: string) {
    return this.prisma.driveGrant.findMany({
      where: { spaceId, nodeId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertGrant(data: {
    spaceId: string;
    nodeId: string | null;
    principalType: DrivePrincipalType;
    principalId: string;
    effect: DriveGrantEffect;
    actions: DriveAction[];
    createdById: string;
  }) {
    const existing = await this.prisma.driveGrant.findFirst({
      where: {
        spaceId: data.spaceId,
        nodeId: data.nodeId,
        principalType: data.principalType,
        principalId: data.principalId,
        effect: data.effect,
      },
    });
    const actions = [...new Set(data.actions)];
    return existing
      ? this.prisma.driveGrant.update({
          where: { id: existing.id },
          data: { actions },
        })
      : this.prisma.driveGrant.create({ data: { ...data, actions } });
  }

  deleteSpaceGrant(spaceId: string, id: string) {
    return this.prisma.driveGrant.deleteMany({
      where: { id, spaceId, nodeId: null },
    });
  }

  deleteNodeGrant(nodeId: string, id: string) {
    return this.prisma.driveGrant.deleteMany({ where: { id, nodeId } });
  }

  listAuditLogs(nodeId: string, fileId: string | null) {
    return this.prisma.driveAuditLog.findMany({
      where: {
        OR: [{ nodeId }, ...(fileId ? [{ fileId }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, username: true, email: true } },
      },
    });
  }

  createAudit(data: {
    spaceId: string;
    actorId?: string;
    action: DriveAuditAction;
    nodeId?: string;
    fileId?: string;
  }) {
    return this.prisma.driveAuditLog.create({ data });
  }

  countUser(userId: string) {
    return this.prisma.user.count({ where: { id: userId } });
  }

  countOrgMember(options: { id?: string; orgId: string; userId?: string }) {
    return this.prisma.orgMember.count({
      where: { ...options, deletedAt: null },
    });
  }

  countDepartment(id: string, orgId: string) {
    return this.prisma.dept.count({
      where: { id, orgId, deletedAt: null },
    });
  }

  countRole(id: string, orgId: string) {
    return this.prisma.role.count({
      where: { id, orgId, deletedAt: null },
    });
  }
}
