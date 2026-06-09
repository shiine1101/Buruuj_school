import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BusStatus, Role, StudentStatus } from "@prisma/client";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BusesService extends BaseCrudService {
  constructor(prisma: PrismaService) { super(prisma); }

  async findAll(user?: { id: string; role: Role }) {
    if (user?.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({
        where: { userId: user.id },
        select: { busId: true }
      });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
      if (!driver.busId) return [];

      return this.prisma.bus.findMany({
        where: { id: driver.busId },
        include: {
          students: {
            where: { status: StudentStatus.ACTIVE },
            orderBy: { fullName: "asc" }
          }
        }
      });
    }

    return this.list("bus", { include: { driver: true, students: true } });
  }

  async createBus(data: { capacity?: number }) {
    if (Number(data.capacity) < 1) throw new BadRequestException("Capacity must be greater than zero");
    return this.create("bus", data);
  }
  updateBus(id: string, data: object) { return this.update("bus", id, data); }
  archive(id: string) { return this.update("bus", id, { status: BusStatus.ARCHIVED }); }
}
