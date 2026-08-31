import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriveAction,
  DriveGrantEffect,
  DrivePrincipalType,
  DriveSpaceType,
  MemberStatus,
  Prisma,
} from '@prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';
import {
  DriveAccessRepository,
  DriveNodeRepository,
  DriveSpaceRepository,
} from '../repositories';

export type DriveAuthContext = Pick<
  AuthContext,
  'userId' | 'orgId' | 'permissions' | 'authMethod'
>;

type SpaceRecord = Prisma.DriveSpaceGetPayload<Record<string, never>>;
type NodeRecord = Prisma.DriveNodeGetPayload<Record<string, never>>;

@Injectable()
export class DrivePolicyService {
  constructor(
    private readonly spaces: DriveSpaceRepository,
    private readonly nodes: DriveNodeRepository,
    private readonly access: DriveAccessRepository,
  ) {}

  requireUserId(auth: DriveAuthContext): string {
    if (!auth.userId) throw new ForbiddenException('当前凭证没有用户身份');
    return auth.userId;
  }

  isDriveAdmin(auth: DriveAuthContext): boolean {
    return auth.permissions.includes('drive:admin');
  }

  async assertSpaceAccess(
    space: SpaceRecord,
    auth: DriveAuthContext,
  ): Promise<void> {
    const userId = this.requireUserId(auth);
    if (this.isDriveAdmin(auth)) return;

    if (space.type === DriveSpaceType.PERSONAL) {
      if (space.ownerUserId !== userId) this.deny();
      return;
    }
    if (space.type === DriveSpaceType.SYSTEM_UNASSIGNED) this.deny();
    if (!space.orgId || auth.orgId !== space.orgId) this.deny();

    const member = await this.access.findMembership(space.orgId, userId);
    if (
      !member ||
      member.status !== MemberStatus.ACTIVE ||
      member.deletedAt !== null
    ) {
      this.deny();
    }
  }

  async assertNodeAction(
    node: NodeRecord,
    action: DriveAction,
    auth: DriveAuthContext,
  ): Promise<void> {
    const space = await this.spaces.findById(node.spaceId);
    if (!space || space.deletedAt) throw new NotFoundException('文件不存在');
    await this.assertSpaceAccess(space, auth);
    if (this.isDriveAdmin(auth) || space.type === DriveSpaceType.PERSONAL) {
      return;
    }

    const principals = await this.resolvePrincipals(space.orgId!, auth);
    const nodeIds = await this.resolveAclPath(node);
    const grants = await this.access.findApplicableGrants({
      spaceId: space.id,
      nodeIds,
      principals,
      action,
    });

    for (const layer of [...nodeIds, null]) {
      const layerGrants = grants.filter((grant) => grant.nodeId === layer);
      if (!layerGrants.length) continue;
      if (layerGrants.some((grant) => grant.effect === DriveGrantEffect.DENY)) {
        this.deny();
      }
      if (
        layerGrants.some((grant) => grant.effect === DriveGrantEffect.ALLOW)
      ) {
        return;
      }
    }

    // Active organization members can read by default. Write operations still
    // require their static route permission and can be narrowed by ACL DENY.
    if (action === DriveAction.VIEW || action === DriveAction.DOWNLOAD) {
      return;
    }

    const permission = this.permissionForAction(action);
    if (!auth.permissions.includes(permission)) this.deny();
  }

  async assertParent(
    spaceId: string,
    parentId: string | null | undefined,
    auth: DriveAuthContext,
    action: DriveAction,
  ): Promise<NodeRecord | null> {
    if (!parentId) {
      const space = await this.spaces.findById(spaceId);
      if (!space || space.deletedAt) throw new NotFoundException('空间不存在');
      await this.assertSpaceAccess(space, auth);
      return null;
    }
    const parent = await this.nodes.findActiveFolder(parentId, spaceId);
    if (!parent) throw new NotFoundException('目标文件夹不存在');
    await this.assertNodeAction(parent, action, auth);
    return parent;
  }

  private async resolvePrincipals(orgId: string, auth: DriveAuthContext) {
    const userId = this.requireUserId(auth);
    const member = await this.access.findPrincipalMembership(orgId, userId);
    if (!member) this.deny();

    const principals: Array<{ type: DrivePrincipalType; id: string }> = [
      { type: DrivePrincipalType.ORG, id: orgId },
      { type: DrivePrincipalType.USER, id: userId },
      { type: DrivePrincipalType.ORG_MEMBER, id: member.id },
      ...member.memberRoles.map((item) => ({
        type: DrivePrincipalType.ROLE,
        id: item.roleId,
      })),
      ...member.memberDepartments.map((item) => ({
        type: DrivePrincipalType.DEPARTMENT,
        id: item.deptId,
      })),
    ];
    if (
      member.primaryDeptId &&
      !principals.some(
        (item) =>
          item.type === DrivePrincipalType.DEPARTMENT &&
          item.id === member.primaryDeptId,
      )
    ) {
      principals.push({
        type: DrivePrincipalType.DEPARTMENT,
        id: member.primaryDeptId,
      });
    }
    return principals;
  }

  private async resolveAclPath(node: NodeRecord): Promise<string[]> {
    const ids: string[] = [];
    let current: NodeRecord | null = node;
    for (let depth = 0; current && depth < 100; depth += 1) {
      ids.push(current.id);
      if (!current.inheritAcl || !current.parentId) break;
      current = await this.nodes.findById(current.parentId);
    }
    return ids;
  }

  private permissionForAction(action: DriveAction): string {
    if (action === DriveAction.UPLOAD) return 'drive:upload';
    if (action === DriveAction.DELETE) return 'drive:delete';
    if (action === DriveAction.MANAGE_ACL) return 'drive:manage-acl';
    return 'drive:update';
  }

  private deny(): never {
    throw new ForbiddenException('无权访问该文件资源');
  }
}
