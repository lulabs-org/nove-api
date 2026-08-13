import { Prisma } from '@prisma/client';

export async function retryVersionTransaction<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : undefined;
      if (attempt >= attempts || (code !== 'P2002' && code !== 'P2034')) {
        throw error;
      }
    }
  }
}
