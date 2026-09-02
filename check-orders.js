const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.profitShareRule.findMany({ include: { modules: { include: { allocations: true } } } });
  console.log("RULES:");
  for (const r of rules) {
    console.log(`- ${r.id} | ${r.name} | valid: ${r.validStartTime} to ${r.validEndTime} | prod: ${r.productId} | channel: ${r.channelId}`);
  }

  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log("\nRECENT ORDERS:");
  for (const o of orders) {
    console.log(`- ${o.id} | amt: ${o.amount} | closedAt: ${o.financialClosedAt} | prod: ${o.productId} | channel: ${o.channelId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
