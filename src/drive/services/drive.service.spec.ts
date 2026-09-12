import { Test } from '@nestjs/testing';
import { DriveSpaceType } from '@/generated/prisma/client';
import { DriveService } from './drive.service';
import { DriveAclService } from '../policies';
import { DriveSpaceRepository } from '../repositories';

describe('Drive space listing', () => {
  it('returns only personal and current organization spaces for administrators', async () => {
    const spaces = {
      ensurePersonal: jest.fn().mockResolvedValue({
        id: 'personal',
        name: 'Personal',
        type: DriveSpaceType.PERSONAL,
        orgId: null,
      }),
      ensureOrganization: jest.fn().mockResolvedValue({
        id: 'team',
        name: 'Team',
        type: DriveSpaceType.ORG,
        orgId: 'org-a',
      }),
    };
    const acl = { requireUserId: jest.fn().mockReturnValue('user-a') };
    const module = await Test.createTestingModule({ providers: [DriveService] })
      .useMocker((token) => {
        if (token === DriveSpaceRepository) return spaces;
        if (token === DriveAclService) return acl;
        return {};
      })
      .compile();
    try {
      const result = await module.get(DriveService).listSpaces({
        userId: 'user-a',
        orgId: 'org-a',
        permissions: ['drive:admin'],
        authMethod: 'jwt',
      });
      expect(result.map((space) => space.type)).toEqual([
        DriveSpaceType.PERSONAL,
        DriveSpaceType.ORG,
      ]);
      expect(spaces.ensurePersonal).toHaveBeenCalledWith('user-a');
      expect(spaces.ensureOrganization).toHaveBeenCalledWith('org-a');
    } finally {
      await module.close();
    }
  });
});
