const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'GRANDES OFERTAS' } }
  });
  console.log('CLIENT:', client);

  if (client) {
    const orders = await prisma.order.findMany({
      where: { clientId: client.id }
    });
    console.log('ORDERS FOR CLIENT:', JSON.stringify(orders, null, 2));
    
    const sales = await prisma.sale.findMany({
      where: { clientId: client.id }
    });
    console.log('SALES FOR CLIENT:', JSON.stringify(sales, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
