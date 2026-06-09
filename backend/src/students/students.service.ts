import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentStatus, RouteSessionStatus, StudentStatus } from "@prisma/client";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";

@Injectable()
export class StudentsService extends BaseCrudService {
  constructor(prisma: PrismaService) { super(prisma); }
  
  findAll(search?: string) {
    return this.list("student", { 
      where: search ? { fullName: { contains: search, mode: "insensitive" } } : undefined, 
      include: { bus: true, payments: true, attendance: true } 
    });
  }

  async createStudent(dto: CreateStudentDto) {
    await this.assertUniqueStudentId(dto.studentId);

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          studentId: dto.studentId,
          fullName: dto.fullName,
          shift: dto.shift,
          parentName: dto.parentName || null,
          parentPhone: dto.parentPhone || null,
          emergencyContact: dto.emergencyContact || dto.parentPhone || "",
          pickupPoint: dto.pickupPoint,
          busId: dto.busId || null,
          academicYear: dto.academicYear
        }
      });

      const paymentData = Array.from({ length: 12 }, (_, i) => ({
        studentId: student.id,
        academicYear: dto.academicYear,
        month: i + 1,
        amount: 120.00,
        status: "UNPAID" as const,
        notes: "Automatically generated on student registration"
      }));

      await tx.payment.createMany({ data: paymentData });
      return student;
    });
  }

  async updateStudent(id: string, data: Partial<CreateStudentDto>) {
    if (data.studentId) await this.assertUniqueStudentId(data.studentId, id);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...data,
        ...(data.parentName !== undefined ? { parentName: data.parentName || null } : {}),
        ...(data.parentPhone !== undefined ? { parentPhone: data.parentPhone || null } : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact || data.parentPhone || "" } : {}),
        ...(data.busId !== undefined ? { busId: data.busId || null } : {})
      }
    });
  }

  async findForDriver(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        bus: {
          include: {
            students: {
              where: { status: StudentStatus.ACTIVE },
              include: {
                attendance: { where: { date: today }, take: 1 },
                payments: true
              },
              orderBy: { fullName: "asc" }
            }
          }
        }
      }
    });

    if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
    if (!driver.bus) return { bus: null, busId: null, busNumber: null, students: [] };

    const currentMonth = new Date().getMonth() + 1;
    return {
      bus: {
        id: driver.bus.id,
        busNumber: driver.bus.busNumber,
        plateNumber: driver.bus.plateNumber,
        capacity: driver.bus.capacity,
        status: driver.bus.status
      },
      busId: driver.bus.id,
      busNumber: driver.bus.busNumber,
      students: driver.bus.students.map((student) => {
        const payment = student.payments.find((item) => item.academicYear === student.academicYear && item.month === currentMonth)
          ?? student.payments.find((item) => item.academicYear === student.academicYear);
        const attendance = student.attendance[0];

        return {
          id: student.id,
          studentId: student.studentId,
          fullName: student.fullName,
          parentName: student.parentName ?? "",
          parentPhone: student.parentPhone ?? "",
          pickupPoint: student.pickupPoint,
          shift: student.shift,
          attendanceStatus: attendance?.droppedHome ? "Dropped Home" : attendance?.pickedUp ? "Picked Up" : "Pending",
          pickedUp: attendance?.pickedUp ?? false,
          droppedHome: attendance?.droppedHome ?? false,
          paymentStatus: payment?.status ?? PaymentStatus.UNPAID
        };
      })
    };
  }

  async dashboardForDriver(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        bus: {
          include: {
            students: {
              where: { status: StudentStatus.ACTIVE },
              include: {
                attendance: { where: { date: today }, take: 1 },
                payments: true
              },
              orderBy: { fullName: "asc" }
            },
            breakdowns: { orderBy: { date: "desc" } }
          }
        }
      }
    });

    if (!driver) throw new NotFoundException("Driver profile is not linked to this user.");
    if (!driver.bus) {
      return {
        bus: null,
        assignedStudentCount: 0,
        attendanceSummary: { pickedUp: 0, droppedHome: 0, pending: 0 },
        routeStatus: "NO_BUS",
        students: [],
        maintenanceRequests: []
      };
    }

    const activeRoute = await this.prisma.routeSession.findFirst({
      where: { busId: driver.bus.id, driverId: driver.id, status: RouteSessionStatus.ACTIVE },
      orderBy: { startTime: "desc" }
    });

    const currentMonth = new Date().getMonth() + 1;
    const students = driver.bus.students.map((student) => {
      const attendance = student.attendance[0];
      const payment = student.payments.find((item) => item.academicYear === student.academicYear && item.month === currentMonth)
        ?? student.payments.find((item) => item.academicYear === student.academicYear);

      return {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        parentName: student.parentName ?? "",
        parentPhone: student.parentPhone ?? "",
        pickupPoint: student.pickupPoint,
        shift: student.shift,
        pickedUp: attendance?.pickedUp ?? false,
        droppedHome: attendance?.droppedHome ?? false,
        paymentStatus: payment?.status ?? PaymentStatus.UNPAID
      };
    });

    return {
      bus: {
        id: driver.bus.id,
        busNumber: driver.bus.busNumber,
        plateNumber: driver.bus.plateNumber,
        capacity: driver.bus.capacity,
        status: driver.bus.status
      },
      assignedStudentCount: students.length,
      attendanceSummary: {
        pickedUp: students.filter((student) => student.pickedUp).length,
        droppedHome: students.filter((student) => student.droppedHome).length,
        pending: students.filter((student) => !student.pickedUp).length
      },
      routeStatus: activeRoute ? "ACTIVE" : "NOT_STARTED",
      students,
      maintenanceRequests: driver.bus.breakdowns.map((item) => ({
        id: item.id,
        type: item.problem.startsWith("Repair") ? "Repair" : "Breakdown",
        problem: item.problem,
        description: item.description,
        status: item.status,
        date: item.date
      }))
    };
  }

  archive(id: string) { return this.update("student", id, { status: StudentStatus.ARCHIVED }); }

  private async assertUniqueStudentId(studentId: string, excludeId?: string) {
    const existing = await this.prisma.student.findUnique({ where: { studentId } });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException("Student ID already exists.");
    }
  }
}
