import { PrismaClient, UserRole } from '@prisma/client';

import { loadEnv } from './lib/load-env';

loadEnv();

const prisma = new PrismaClient();

async function main() {
  const coordinator = await prisma.user.findFirst({
    where: { role: UserRole.COORDINATOR, isActive: true },
    select: { email: true, id: true },
  });

  if (!coordinator) {
    console.error('No active coordinator user found in database');
    process.exit(1);
  }

  console.log(coordinator.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
