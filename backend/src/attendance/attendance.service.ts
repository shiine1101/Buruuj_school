import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";

type AttendanceInput = {
  studentId: string;
  date: string;
  pickedUp: boolean;
  droppedHome: boolean;
};

@Injectable()
export class AttendanceService extends BaseCrudService {
  constructor(prisma: PrismaService) { super(prisma); }

  async findAll(user: { id: string; role: Role }) {
    if (user.role !== Role.DRIVER) {
      return this.list("attendance", {
        include: { student: { include: { bus: true } }, recorder: true },
        orderBy: { date: "desc" }
      });
    }

    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");

    return this.prisma.attendance.findMany({
      where: { student: { busId: driver.busId ?? "__unassigned__" } },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            parentName: true,
            parentPhone: true,
            status: true,
            busId: true,
            bus: { select: { id: true, busNumber: true, plateNumber: true } }
          }
        },
        recorder: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { date: "desc" }
    });
  }

  async mark(data: AttendanceInput, user: { id: string; role: Role }) {
    const attendanceDate = new Date(data.date);
    attendanceDate.setHours(0, 0, 0, 0);

    if (user.role === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");

      const student = await this.prisma.student.findUnique({ where: { id: data.studentId } });
      if (!student || student.busId !== driver.busId) {
        throw new BadRequestException("Drivers can only mark attendance for students assigned to their bus.");
      }
    }

    return this.prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: data.studentId,
          date: attendanceDate
        }
      },
      create: {
        studentId: data.studentId,
        date: attendanceDate,
        pickedUp: data.pickedUp,
        droppedHome: data.droppedHome,
        recordedBy: user.id
      },
      update: {
        pickedUp: data.pickedUp,
        droppedHome: data.droppedHome,
        recordedBy: user.id
      },
      include: { student: { include: { bus: true } }, recorder: true }
    });
  }
}
