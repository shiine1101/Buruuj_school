import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}
  async dashboard() {
    const [students, drivers, buses, paid, fuel, repairs] = await Promise.all([
      this.prisma.student.count({ where: { status: "ACTIVE" } }),
      this.prisma.driver.count({ where: { status: "ACTIVE" } }),
      this.prisma.bus.count({ where: { status: "ACTIVE" } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      this.prisma.fuelRecord.aggregate({ _sum: { cost: true } }),
      this.prisma.breakdown.aggregate({ _sum: { repairCost: true } })
    ]);
    return { students, drivers, buses, revenue: paid._sum.amount ?? 0, fuelCost: fuel._sum.cost ?? 0, repairCost: repairs._sum.repairCost ?? 0 };
  }
}
