import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const superAdminEmails = [
  { email: 'roy@royslab.com', name: 'Roy Magariños' },
  { email: 'santos.dlc@gmail.com', name: 'Santos DLC' },
];

async function main() {
  console.log('Iniciando seed de base de datos para Astrolegia...');

  for (const admin of superAdminEmails) {
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        role: UserRole.super_admin,
      },
      create: {
        email: admin.email,
        name: admin.name,
        role: UserRole.super_admin,
      },
    });

    console.log(`✓ Super-admin configurado: ${user.email} (ID: ${user.id})`);
  }

  console.log('Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
