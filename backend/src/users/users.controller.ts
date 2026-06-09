import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.service.remove(id, user.id);
  }

  @Patch(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.service.activate(id, user.id);
  }

  @Patch(":id/disable")
  disable(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.service.disable(id, user.id);
  }

  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.service.resetPassword(id, dto, user.id);
  }
}
