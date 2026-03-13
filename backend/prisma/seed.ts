// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin2026', 10);

  // Crear roles definidos por el usuario
  const roles = [
    { name: 'ADMIN', description: 'Acceso total al sistema' },
    { name: 'CLIENTE', description: 'Módulo de clientes' },
    { name: 'COMERCIAL', description: 'Módulo de ventas y comercial' },
    { name: 'CONTABILIDAD', description: 'Módulo contable' },
    { name: 'LOGISTICA', description: 'Módulo de compras e inventario' },
    { name: 'ODP', description: 'Módulo de calidad y auditoría' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // Upsert admin user assigning all roles (requested by user)
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      name: 'Administrador',
      password: passwordHash,
      roles: {
        set: [], // Limpiar roles anteriores
        connect: roles.map(r => ({ name: r.name }))
      }
    },
    create: {
      email: 'admin@gmail.com',
      name: 'Administrador',
      password: passwordHash,
      roles: {
        connect: roles.map(r => ({ name: r.name }))
      }
    },
  });

  console.log('✅ Roles y Admin creados exitosamente');
  console.log('📧 Email: admin@gmail.com');
  console.log('🔑 Contraseña: admin2026');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });