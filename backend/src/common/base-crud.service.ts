import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type ModelName = "student" | "driver" | "bus" | "payment" | "attendance" | "fuelRecord" | "breakdown";

@Injectable()
export class BaseCrudService {
  constructor(protected readonly prisma: PrismaService) {}

  list(model: ModelName, args: Record<string, unknown> = {}) {
    return (this.prisma as any)[model].findMany(args);
  }

  create(model: ModelName, data: object) {
    return (this.prisma as any)[model].create({ data });
  }

  update(model: ModelName, id: string, data: object) {
    return (this.prisma as any)[model].update({ where: { id }, data });
  }
}
