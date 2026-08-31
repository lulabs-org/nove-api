import { ForbiddenException } from '@nestjs/common';
import {
  DriveAction,
  DriveGrantEffect,
  DriveSpaceType,
  MemberStatus,
} from '@prisma/client';
import {
  DriveAccessRepository,
  DriveNodeRepository,
  DriveSpaceRepository,
} from '../repositories';
import { DrivePolicyService } from './drive-policy.service';

describe('DrivePolicyService', () => {
  const prisma = {
    driveSpace: { findUnique: jest.fn() },
    orgMember: { findUnique: jest.fn() },
    driveGrant: { findMany: jest.fn() },
    driveNode: { findUnique: jest.fn() },
  };
  const service = new DrivePolicyService(
    new DriveSpaceRepository(prisma as never),
    new DriveNodeRepository(prisma as never),
    new DriveAccessRepository(prisma as never),
  );
  const auth = {
    authMethod: 'jwt' as const,
    userId: 'user-1',
    orgId: 'org-1',
    permissions: ['drive:read', 'drive:update'],
  };
  const node = {
    id: 'node-1',
    spaceId: 'space-1',
    parentId: null,
    type: 'FILE' as const,
    name: 'a.pdf',
    inheritAcl: true,
    fileId: 'file-1',
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    purgeAfter: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.driveSpace.findUnique.mockResolvedValue({
      id: 'space-1',
      type: DriveSpaceType.ORG,
      orgId: 'org-1',
      ownerUserId: null,
      deletedAt: null,
    });
    prisma.orgMember.findUnique.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
      deletedAt: null,
      primaryDeptId: null,
      memberRoles: [],
      memberDepartments: [],
    });
    prisma.driveGrant.findMany.mockResolvedValue([]);
  });

  it('allows active organization members to read by default', async () => {
    await expect(
      service.assertNodeAction(node, DriveAction.VIEW, auth),
    ).resolves.toBeUndefined();
  });

  it('applies explicit deny before default organization read', async () => {
    prisma.driveGrant.findMany.mockResolvedValue([
      { nodeId: 'node-1', effect: DriveGrantEffect.DENY },
    ]);
    await expect(
      service.assertNodeAction(node, DriveAction.VIEW, auth),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects cross-organization access without revealing a node', async () => {
    await expect(
      service.assertNodeAction(node, DriveAction.VIEW, {
        ...auth,
        orgId: 'org-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
