import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateOperatingAreaDto, UpdateOperatingAreaDto } from "./dto/operating-area.dto";
import { CreatePickupPointDto } from "./dto/pickup-point.dto";
import { LocationDto } from "./dto/location.dto";
import { RouteHistoryQueryDto } from "./dto/route-history.dto";
import { LiveTrackingService } from "./live-tracking.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("live-tracking")
export class LiveTrackingController {
  constructor(private readonly service: LiveTrackingService) {}

  @Post("start-route")
  @Roles(Role.DRIVER)
  startRoute(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.service.startRoute(user);
  }

  @Post("end-route")
  @Roles(Role.DRIVER)
  endRoute(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.service.endRoute(user);
  }

  @Post("location")
  @Roles(Role.DRIVER)
  recordLocation(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Body() dto: LocationDto
  ) {
    return this.service.recordLocation(user, dto);
  }

  @Post("gps-denied")
  @Roles(Role.DRIVER)
  reportGpsDenied(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.service.reportGpsDenied(user);
  }

  @Get("active")
  @Roles(Role.ADMIN)
  getActiveRoutes() {
    return this.service.getActiveRoutes();
  }

  @Get("dashboard")
  @Roles(Role.ADMIN)
  getDashboard() {
    return this.service.getDashboardStats();
  }

  @Get("driver-session")
  @Roles(Role.DRIVER)
  getDriverSession(@CurrentUser() user: { id: string; email: string; role: string }) {
    return this.service.getDriverSession(user);
  }

  @Get("history")
  @Roles(Role.ADMIN)
  getHistory(@Query() query: RouteHistoryQueryDto) {
    return this.service.getRouteHistory(query.period, query.busId);
  }

  @Get("operating-areas")
  @Roles(Role.ADMIN)
  listOperatingAreas() {
    return this.service.listOperatingAreas();
  }

  @Post("operating-areas")
  @Roles(Role.ADMIN)
  createOperatingArea(@Body() dto: CreateOperatingAreaDto) {
    return this.service.createOperatingArea(dto);
  }

  @Patch("operating-areas/:id")
  @Roles(Role.ADMIN)
  updateOperatingArea(@Param("id") id: string, @Body() dto: UpdateOperatingAreaDto) {
    return this.service.updateOperatingArea(id, dto);
  }

  @Delete("operating-areas/:id")
  @Roles(Role.ADMIN)
  deleteOperatingArea(@Param("id") id: string) {
    return this.service.deleteOperatingArea(id);
  }

  @Get("pickup-points")
  @Roles(Role.ADMIN)
  listPickupPoints() {
    return this.service.listPickupPoints();
  }

  @Post("pickup-points")
  @Roles(Role.ADMIN)
  createPickupPoint(@Body() dto: CreatePickupPointDto) {
    return this.service.createPickupPoint(dto);
  }

  @Delete("pickup-points/:id")
  @Roles(Role.ADMIN)
  deletePickupPoint(@Param("id") id: string) {
    return this.service.deletePickupPoint(id);
  }

  @Get("violations")
  @Roles(Role.ADMIN)
  listViolations() {
    return this.service.listViolations();
  }

  @Get("notifications")
  @Roles(Role.ADMIN)
  listNotifications() {
    return this.service.listTrackingNotifications();
  }

  @Get("logs")
  @Roles(Role.ADMIN)
  listLogs(
    @Query("busId") busId?: string,
    @Query("driverId") driverId?: string,
    @Query("date") date?: string
  ) {
    return this.service.listTrackingLogs(busId, driverId, date);
  }
}
