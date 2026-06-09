import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AuditAction, Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from "./dto/user.dto";

const MANAGED_ROLES: Role[] = [Role.ADMIN, Role.DRIVER, Role.FINANCIAL_OFFICER];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertManagedRole(role: Role) {
    if (!MANAGED_ROLES.includes(role)) {
      throw new BadRequestException("Only Admin, Driver, and Financial Officer roles can be managed.");
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: { in: MANAGED_ROLES } },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        driver: {
          select: {
            id: true,
            fullName: true,
            bus: { select: { busNumber: true } }
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(dto: CreateUserDto, actorId: string) {
    this.assertManagedRole(dto.role);
    if (dto.role !== Role.DRIVER && dto.driverId) {
      throw new BadRequestException("Only Driver users can be linked to driver profiles.");
    }
    if (dto.role === Role.DRIVER && !dto.driverId) {
      throw new BadRequestException("Driver users must be linked to a driver profile.");
    }

    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }]
      }
    });
    if (exists) throw new BadRequestException("Username or email already exists.");

    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.role === Role.DRIVER) {
        const driver = await tx.driver.findUnique({ where: { id: dto.driverId } });
        if (!driver) throw new BadRequestException("Linked driver profile was not found.");
        if (driver.userId) throw new BadRequestException("This driver profile already has a login account.");
      }

      const created = await tx.user.create({
        data: {
          fullName: dto.fullName,
          username: dto.username,
          email: dto.email,
          phone: dto.phone,
          role: dto.role,
          status: UserStatus.ACTIVE,
          passwordHash: await bcrypt.hash(dto.password, 10)
        },
        select: this.userSelect()
      });

      if (dto.role === Role.DRIVER && dto.driverId) {
        await tx.driver.update({
          where: { id: dto.driverId },
          data: { userId: created.id }
        });
      }

      return tx.user.findUniqueOrThrow({ where: { id: created.id }, select: this.userSelect() });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.CREATE,
        entity: "User",
        entityId: user.id,
        metadata: { role: user.role }
      }
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { driver: true } });
    if (!existing || !MANAGED_ROLES.includes(existing.role)) {
      throw new NotFoundException("User not found.");
    }
    if (dto.role) this.assertManagedRole(dto.role);
    if (dto.role !== Role.DRIVER && dto.driverId) {
      throw new BadRequestException("Only Driver users can be linked to driver profiles.");
    }

    const nextRole = dto.role ?? existing.role;
    if (nextRole === Role.DRIVER && !dto.driverId && !existing.driver) {
      throw new BadRequestException("Driver users must be linked to a driver profile.");
    }

    const { driverId, ...userData } = dto;
    const user = await this.prisma.$transaction(async (tx) => {
      if (driverId) {
        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        if (!driver) throw new BadRequestException("Linked driver profile was not found.");
        if (driver.userId && driver.userId !== id) {
          throw new BadRequestException("This driver profile already has a login account.");
        }
      }

      if (existing.driver && (nextRole !== Role.DRIVER || (driverId && driverId !== existing.driver.id))) {
        await tx.driver.update({ where: { id: existing.driver.id }, data: { userId: null } });
      }

      await tx.user.update({
        where: { id },
        data: userData
      });

      if (nextRole === Role.DRIVER && driverId) {
        await tx.driver.update({ where: { id: driverId }, data: { userId: id } });
      }

      return tx.user.findUniqueOrThrow({ where: { id }, select: this.userSelect() });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.UPDATE,
        entity: "User",
        entityId: user.id,
        metadata: dto as object
      }
    });

    return user;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || !MANAGED_ROLES.includes(existing.role)) {
      throw new NotFoundException("User not found.");
    }
    if (existing.id === actorId) {
      throw new BadRequestException("You cannot delete your own account.");
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DISABLED }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.ARCHIVE,
        entity: "User",
        entityId: id
      }
    });

    return { success: true };
  }

  async activate(id: string, actorId: string) {
    return this.setStatus(id, UserStatus.ACTIVE, actorId);
  }

  async disable(id: string, actorId: string) {
    return this.setStatus(id, UserStatus.DISABLED, actorId);
  }

  private async setStatus(id: string, status: UserStatus, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || !MANAGED_ROLES.includes(existing.role)) {
      throw new NotFoundException("User not found.");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.UPDATE,
        entity: "User",
        entityId: id,
        metadata: { status }
      }
    });

    return user;
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || !MANAGED_ROLES.includes(existing.role)) {
      throw new NotFoundException("User not found.");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, 10),
        refreshTokenHash: null
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.UPDATE,
        entity: "User",
        entityId: id,
        metadata: { field: "password", resetByAdmin: true }
      }
    });

    return { success: true };
  }

  private userSelect() {
    return {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      driver: {
        select: {
          id: true,
          fullName: true,
          bus: { select: { busNumber: true } }
        }
      },
      createdAt: true,
      updatedAt: true
    };
  }
}
