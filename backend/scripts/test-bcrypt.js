const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const email = "driver@buruuj.school";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("User not found!");
    return;
  }
  
  const valid = await bcrypt.compare("driver123", user.passwordHash);
  console.log(`Bcrypt compare for driver123: ${valid}`);
  
  const manualHash = await bcrypt.hash("driver123", 10);
  const manualValid = await bcrypt.compare("driver123", manualHash);
  console.log(`Bcrypt compare for manual hash: ${manualValid}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
