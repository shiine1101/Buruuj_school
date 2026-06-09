import { BadRequestException, Injectable } from "@nestjs/common";
import { DriverStatus, Role } from "@prisma/client";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { CreateDriverDto } from "./dto/create-driver.dto";

@Injectable()
export class DriversService extends BaseCrudService {
  constructor(prisma: PrismaService, private readonly studentsService: StudentsService) { super(prisma); }

  findAll() { return this.list("driver", { include: { bus: true, user: true } }); }

  dashboard(userId: string) {
    return this.studentsService.dashboardForDriver(userId);
  }

  async createDriver(dto: CreateDriverDto) {
    const { userId, ...driverData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const linkedUserId = userId;

      if (linkedUserId) {
        const user = await tx.user.findUnique({ where: { id: linkedUserId }, include: { driver: true } });
        if (!user || user.role !== Role.DRIVER) {
          throw new BadRequestException("Linked user must exist and have the Driver role.");
        }
        if (user.driver) {
          throw new BadRequestException("This driver user is already linked to a driver profile.");
        }
      }

      return tx.driver.create({
        data: {
          ...driverData,
          userId: linkedUserId ?? null,
          busId: driverData.busId || null
        },
        include: { bus: true, user: true }
      });
    });
  }

  async updateDriver(id: string, dto: Partial<CreateDriverDto>) {
    const { userId, ...data } = dto;

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { driver: true } });
      if (!user || user.role !== Role.DRIVER) {
        throw new BadRequestException("Linked user must exist and have the Driver role.");
      }
      if (user.driver && user.driver.id !== id) {
        throw new BadRequestException("This driver user is already linked to a different driver profile.");
      }
    }

    return this.prisma.driver.update({
      where: { id },
      data: { ...data, ...(data.busId !== undefined ? { busId: data.busId || null } : {}), ...(userId ? { userId } : {}) },
      include: { bus: true, user: true }
    });
  }

  archive(id: string) { return this.update("driver", id, { status: DriverStatus.ARCHIVED }); }
}
