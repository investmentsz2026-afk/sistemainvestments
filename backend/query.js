const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.salePayment.findMany({
    where: { sale: { invoiceNumber: 'F001-000036' } }
  });
  console.log(JSON.stringify(payments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
