const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('finance123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'finance@buruuj.school' },
    update: {},
    create: {
      username: 'finance',
      email: 'finance@buruuj.school',
      passwordHash,
      fullName: 'Faadumo Warsame',
      role: 'FINANCIAL_OFFICER',
      status: 'ACTIVE'
    }
  });
  console.log('Seeded Financial Officer:', user.email);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
