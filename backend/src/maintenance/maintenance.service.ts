import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";

type FuelInput = {
  busId: string;
  liters: number;
  cost: number;
  date: string;
  notes?: string;
};

type BreakdownInput = {
  busId: string;
  problem: string;
  description: string;
  repairCost?: number;
  date: string;
};

@Injectable()
export class MaintenanceService extends BaseCrudService {
  constructor(prisma: PrismaService) { super(prisma); }
  async fuelRecords(user?: { id: string; role: Role }) {
    if (user?.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
      const records = await this.prisma.fuelRecord.findMany({
        where: { busId: driver.busId ?? "__unassigned__" },
        include: { bus: { select: { id: true, busNumber: true, plateNumber: true } } },
        orderBy: { date: "desc" }
      });
      return records.map((record) => ({
        id: record.id,
        busId: record.busId,
        bus: record.bus,
        liters: record.liters,
        date: record.date,
        notes: record.notes
      }));
    }
    return this.list("fuelRecord", { include: { bus: true, creator: true }, orderBy: { date: "desc" } });
  }
  async breakdowns(user?: { id: string; role: Role }) {
    if (user?.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
      const records = await this.prisma.breakdown.findMany({
        where: { busId: driver.busId ?? "__unassigned__" },
        include: { bus: { select: { id: true, busNumber: true, plateNumber: true } } },
        orderBy: { date: "desc" }
      });
      return records.map((record) => ({
        id: record.id,
        busId: record.busId,
        bus: record.bus,
        problem: record.problem,
        description: record.description,
        status: record.status,
        date: record.date
      }));
    }
    return this.list("breakdown", { include: { bus: true, reporter: true }, orderBy: { date: "desc" } });
  }
  async createFuel(data: FuelInput, user: { id: string; role: Role }) {
    if (user.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
      if (!driver.busId || data.busId !== driver.busId) {
        throw new BadRequestException("Drivers can only submit fuel records for their assigned bus.");
      }
    }
    return this.create("fuelRecord", { ...data, createdBy: user.id, date: new Date(data.date) });
  }
  async createBreakdown(data: BreakdownInput, user: { id: string; role: Role }) {
    if (user.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
      if (!driver.busId || data.busId !== driver.busId) {
        throw new BadRequestException("Drivers can only report breakdowns for their assigned bus.");
      }
    }
    return this.create("breakdown", { ...data, reportedBy: user.id, date: new Date(data.date) });
  }
  async summary() {
    const [fuel, repairs] = await Promise.all([
      this.prisma.fuelRecord.aggregate({ _sum: { cost: true } }),
      this.prisma.breakdown.aggregate({ _sum: { repairCost: true } })
    ]);
    return { fuelCost: fuel._sum.cost ?? 0, repairCost: repairs._sum.repairCost ?? 0 };
  }
}
