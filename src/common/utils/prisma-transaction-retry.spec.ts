import { Prisma } from '@prisma/client';
import { retryVersionTransaction } from './prisma-transaction-retry';

describe('retryVersionTransaction', () => {
  it('retries serialization and unique conflicts', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      )
      .mockResolvedValue('ok');
    await expect(retryVersionTransaction(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
