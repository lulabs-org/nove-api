const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const records = await prisma.profitShareRecord.findMany({
    include: { order: true }
  });
  console.log(`Found ${records.length} records.`);
  for (const r of records) {
    console.log(`Record ${r.id}: orderId=${r.orderId}, ruleId=${r.ruleId}, status=${r.status}, amount=${r.profitAmount}`);
  }
}
run().finally(() => prisma.$disconnect());
