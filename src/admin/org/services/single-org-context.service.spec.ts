import { PrismaService } from '@/prisma/prisma.service';
import { SingleOrgContextService } from './single-org-context.service';

describe('SingleOrgContextService', () => {
  const createService = (organizations: Array<{ id: string }>) => {
    const findMany = jest.fn().mockResolvedValue(organizations);
    const prisma = {
      org: {
        findMany,
      },
    } as unknown as PrismaService;
    return { service: new SingleOrgContextService(prisma), findMany };
  };

  it('caches the only active organization', async () => {
    const { service, findMany } = createService([{ id: 'org-1' }]);

    await expect(service.initialize()).resolves.toBe('org-1');
    expect(service.getOrgId()).toBe('org-1');
    expect(service.matches('org-1')).toBe(true);
    expect(service.matches('org-2')).toBe(false);
    expect(findMany).toHaveBeenCalledWith({
      where: { active: true, deletedAt: null },
      select: { id: true },
      take: 2,
    });
  });

  it.each([
    { organizations: [] as Array<{ id: string }> },
    { organizations: [{ id: 'org-1' }, { id: 'org-2' }] },
  ])(
    'rejects startup unless exactly one active organization exists',
    async ({ organizations }) => {
      const { service } = createService(organizations);
      await expect(service.initialize()).rejects.toThrow(
        'exactly one active organization',
      );
    },
  );

  it('rejects access before startup initialization', () => {
    const { service } = createService([{ id: 'org-1' }]);
    expect(() => service.getOrgId()).toThrow('is not initialized');
  });
});
