const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: { role: 'DRIVER' },
    select: { id: true, username: true, email: true, fullName: true, role: true, status: true }
  });
  console.log('=== DRIVER USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const drivers = await p.driver.findMany({
    select: { id: true, userId: true, fullName: true, status: true, busId: true, licenseNumber: true }
  });
  console.log('\n=== DRIVER RECORDS ===');
  console.log(JSON.stringify(drivers, null, 2));

  const activeSessions = await p.routeSession.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, driverId: true, busId: true, status: true, startTime: true }
  });
  console.log('\n=== ACTIVE ROUTE SESSIONS ===');
  console.log(JSON.stringify(activeSessions, null, 2));
}

main().finally(() => p.$disconnect());
