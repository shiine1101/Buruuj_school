import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateStudentDto } from "./dto/create-student.dto";
import { StudentsService } from "./students.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly service: StudentsService) {}
  @Get() @Roles(Role.ADMIN) findAll(@Query("search") search?: string) { return this.service.findAll(search); }
  @Get("my-bus") @Roles(Role.DRIVER) findMyBusStudents(@CurrentUser() user: { id: string }) { return this.service.findForDriver(user.id); }
  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateStudentDto) { return this.service.createStudent(dto); }
  @Patch(":id") @Roles(Role.ADMIN) update(@Param("id") id: string, @Body() dto: Partial<CreateStudentDto>) { return this.service.updateStudent(id, dto); }
  @Patch(":id/archive") @Roles(Role.ADMIN) archive(@Param("id") id: string) { return this.service.archive(id); }
}
