const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('Prisma Connected Successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());