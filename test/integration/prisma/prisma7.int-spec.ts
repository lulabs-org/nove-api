import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createPrismaAdapter } from '../../../src/prisma/prisma-adapter';

describe('Prisma 7 PostgreSQL compatibility', () => {
  const prefix = `prisma7-${randomUUID()}`;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    try {
      await prisma.product.deleteMany({
        where: { productCode: { startsWith: prefix } },
      });
    } finally {
      await prisma.onModuleDestroy();
    }
  });

  it('round-trips enums, arrays, decimals and timestamps and maps unique errors', async () => {
    const data = {
      productCode: `${prefix}-types`,
      name: 'Prisma compatibility test',
      category: 'COURSE' as const,
      tags: ['prisma7'],
      rating: new Prisma.Decimal('4.25'),
      publishedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const created = await prisma.product.create({ data });
    const found = await prisma.product.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(found.category).toBe('COURSE');
    expect(found.tags).toEqual(['prisma7']);
    expect(found.rating?.toFixed(2)).toBe('4.25');
    expect(found.publishedAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    await expect(prisma.product.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
    await prisma.product.update({
      where: { id: created.id },
      data: { status: 'ACTIVE' },
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe('ACTIVE');
  });

  it('commits batch transactions and rolls back interactive transactions', async () => {
    await prisma.$transaction([
      prisma.product.create({
        data: {
          productCode: `${prefix}-commit`,
          name: 'commit',
          category: 'OTHER',
          tags: [],
        },
      }),
    ]);
    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.product.create({
            data: {
              productCode: `${prefix}-rollback`,
              name: 'rollback',
              category: 'OTHER',
              tags: [],
            },
          });
          throw new Error('rollback');
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    ).rejects.toThrow('rollback');
    expect(
      await prisma.product.count({
        where: { productCode: `${prefix}-commit` },
      }),
    ).toBe(1);
    expect(
      await prisma.product.count({
        where: { productCode: `${prefix}-rollback` },
      }),
    ).toBe(0);
  });

  it('decodes JSON, bigint and date values in parameterized raw queries', async () => {
    const rows = await prisma.$queryRaw<
      { value: bigint; payload: { ok: boolean }; at: Date }[]
    >`
      SELECT ${'9007199254740993'}::bigint AS value, '{"ok":true}'::jsonb AS payload, now() AS at
    `;
    expect(rows[0].value).toBe(9007199254740993n);
    expect(rows[0].payload).toEqual({ ok: true });
    expect(rows[0].at).toBeInstanceOf(Date);
  });

  it('uses the requested schema rather than silently writing to public', async () => {
    const schema = `prisma7_${randomUUID().replaceAll('-', '')}`;
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', schema);
    const scoped = new PrismaClient({
      adapter: createPrismaAdapter(url.toString()),
    });
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE "${schema}".orgs (LIKE public.orgs INCLUDING ALL)`,
      );
      const code = `${prefix}-schema`;
      await scoped.org.create({
        data: { code, name: 'Schema isolation' },
      });
      expect(await scoped.org.count({ where: { code } })).toBe(1);
      expect(await prisma.org.count({ where: { code } })).toBe(0);
    } finally {
      await scoped.$disconnect();
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  });

  it('retains P2034 for retryable serializable write conflicts', async () => {
    const product = await prisma.product.create({
      data: {
        productCode: `${prefix}-conflict`,
        name: 'conflict',
        category: 'OTHER',
        tags: [],
      },
    });
    let readers = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => {
      release = resolve;
    });
    const update = () =>
      prisma.$transaction(
        async (tx) => {
          await tx.product.findUniqueOrThrow({ where: { id: product.id } });
          readers += 1;
          if (readers === 2) release();
          await bothRead;
          return tx.product.update({
            where: { id: product.id },
            data: { salesCount: { increment: 1 } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    const results = await Promise.allSettled([update(), update()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: { code: 'P2034' } });
  });
});
