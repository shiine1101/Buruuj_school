import { PrismaClient, Role, UserStatus, DriverStatus, BusStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const driverHash = await bcrypt.hash("driver123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const financeHash = await bcrypt.hash("finance123", 10);

  const driverUser = await prisma.user.upsert({
    where: { email: "driver@buruuj.school" },
    update: {
      passwordHash: driverHash,
      role: Role.DRIVER,
      status: UserStatus.ACTIVE
    },
    create: {
      username: "driver",
      email: "driver@buruuj.school",
      passwordHash: driverHash,
      fullName: "Mahad Ibrahim",
      role: Role.DRIVER,
      status: UserStatus.ACTIVE
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@buruuj.school" },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    },
    create: {
      username: "admin",
      email: "admin@buruuj.school",
      passwordHash: adminHash,
      fullName: "Admin User",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  const financeUser = await prisma.user.upsert({
    where: { email: "finance@buruuj.school" },
    update: {
      passwordHash: financeHash,
      role: Role.FINANCIAL_OFFICER,
      status: UserStatus.ACTIVE
    },
    create: {
      username: "finance",
      email: "finance@buruuj.school",
      passwordHash: financeHash,
      fullName: "Faadumo Warsame",
      role: Role.FINANCIAL_OFFICER,
      status: UserStatus.ACTIVE
    }
  });

  const bus = await prisma.bus.upsert({
    where: { busNumber: "BUS-101" },
    update: {},
    create: {
      busNumber: "BUS-101",
      plateNumber: "MOG-7821",
      capacity: 54,
      status: BusStatus.ACTIVE
    }
  });

  await prisma.driver.upsert({
    where: { licenseNumber: "DRV-90821" },
    update: {
      userId: driverUser.id,
      busId: bus.id,
      status: DriverStatus.ACTIVE
    },
    create: {
      fullName: "Mahad Ibrahim",
      phone: "+252 61 555 8800",
      licenseNumber: "DRV-90821",
      userId: driverUser.id,
      busId: bus.id,
      status: DriverStatus.ACTIVE
    }
  });

  console.log("Seeded and reset live tracking users:", {
    admin: adminUser.email,
    finance: financeUser.email,
    driver: driverUser.email,
    bus: bus.busNumber
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
