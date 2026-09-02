const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Create a mock rule
  const rule = await prisma.profitShareRule.create({
    data: {
      name: 'Test Amortization Rule',
      validStartTime: new Date('2026-01-01T00:00:00.000Z'),
      validEndTime: new Date('2026-12-31T23:59:59.000Z'),
      status: 'ACTIVE',
      modules: {
        create: {
          name: 'Sales Module',
          shareRatio: 0.1, // 10%
          amortizationType: 'MONTHLY',
          allocations: {
            create: {
              memberId: 'user1',
              allocationRatio: 1.0, // 100%
            }
          }
        }
      }
    },
    include: {
      modules: {
        include: {
          allocations: true
        }
      }
    }
  });

  // Create a mock order with 12 months duration
  const order = await prisma.order.create({
    data: {
      orderCode: 'TEST-AMORT-001',
      orderNumber: 'TEST-AMORT-001',
      amount: 12000, // 120 RMB
      status: 'COMPLETED',
      financialClosedAt: new Date('2026-06-01T00:00:00.000Z'),
      benefitStart: new Date('2026-06-01T00:00:00.000Z'),
      benefitEnd: new Date('2027-06-01T00:00:00.000Z'),
    }
  });

  // Trigger calculation
  const res = await fetch(`http://localhost:3000/profit-sharing/rules/${rule.id}/calculate`, {
    method: 'POST'
  });
  const data = await res.json();
  console.log('Calculate API Response:', data);

  // Check generated records
  const records = await prisma.profitShareRecord.findMany({
    where: { orderId: order.id },
    orderBy: { settlementTime: 'asc' }
  });
  console.log(`Generated ${records.length} records.`);
  records.forEach((r, i) => {
    console.log(`Record ${i+1}: amount=${r.profitAmount}, settlementTime=${r.settlementTime.toISOString()}`);
  });

  // Clean up
  await prisma.profitShareRecord.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.profitShareRule.delete({ where: { id: rule.id } });
}
run().finally(() => prisma.$disconnect());
