const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber: '000002' },
    include: { client: true }
  });
  console.log('ORDER:', JSON.stringify(order, null, 2));
  
  if (order) {
    const sale = await prisma.sale.findFirst({
      where: { clientId: order.clientId, totalAmount: 6264 }
    });
    console.log('SALE:', JSON.stringify(sale, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
