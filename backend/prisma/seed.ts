// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@proyectolima.com' },
    update: {},
    create: {
      email: 'admin@proyectolima.com', // Corregido: mismo email que en where
      name: 'Administrador', // 👈 IMPORTANTE: name es obligatorio en el schema
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuario admin creado exitosamente');
  console.log('📧 Email: admin@proyectolima.com');
  console.log('🔑 Contraseña: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });