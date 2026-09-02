const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany({
    where: {
      financialClosedAt: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-10-02T23:59:59.999Z'),
      }
    },
    include: {
      profitShareRecords: true
    }
  });
  console.log(`Found ${orders.length} orders closed in this range.`);
  for (const o of orders) {
    console.log(`Order ${o.id}: productId=${o.productId}, channelId=${o.channelId}, records=${o.profitShareRecords.length}`);
  }
}
run().finally(() => prisma.$disconnect());
