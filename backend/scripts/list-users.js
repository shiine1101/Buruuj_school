const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in Database:");
  console.log(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, status: u.status })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
