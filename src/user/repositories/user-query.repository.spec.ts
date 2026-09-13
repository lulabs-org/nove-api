import { PrismaService } from '@/prisma/prisma.service';
import { UserQueryRepository } from './user-query.repository';

describe('UserQueryRepository', () => {
  it('queries a phone target with ordinary fields inside findFirst OR', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new UserQueryRepository({
      user: { findFirst },
    } as unknown as PrismaService);

    await repository.byTarget('18184509447', '+86');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { username: '18184509447' },
            { email: '18184509447' },
            { countryCode: '+86', phone: '18184509447' },
          ],
        },
      }),
    );
  });
});
