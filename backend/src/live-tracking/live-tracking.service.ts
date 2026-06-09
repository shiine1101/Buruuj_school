import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { DriverStatus, RouteSessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LiveTrackingGateway } from "./live-tracking.gateway";
import { CreateOperatingAreaDto, UpdateOperatingAreaDto } from "./dto/operating-area.dto";
import { CreatePickupPointDto } from "./dto/pickup-point.dto";
import { LocationDto } from "./dto/location.dto";
import {
  distanceMeters,
  isInsideAnyArea,
  parsePolygon,
  type LatLng
} from "./geofence.util";

type AuthUser = { id: string; email: string; role: string };
type BusRuntimeStatus = "Moving" | "Stopped" | "Offline";

const OFFLINE_AFTER_MS = 2 * 60 * 1000;
const MOVING_SPEED_KMH = 5;

@Injectable()
export class LiveTrackingService {
  private readonly logger = new Logger(LiveTrackingService.name);
  private readonly outsideAreaState = new Map<string, boolean>();
  private readonly offlineState = new Map<string, boolean>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LiveTrackingGateway
  ) {}

  private async resolveDriver(userId: string) {
    // First, look up any driver record for this userId regardless of status so we can
    // produce a precise diagnostic message when the lookup fails.
    const anyDriver = await this.prisma.driver.findFirst({
      where: { userId },
      select: { id: true, status: true, busId: true, userId: true }
    });

    if (!anyDriver) {
      this.logger.error(
        `[resolveDriver] DENIED – No Driver row found with userId=${userId}. ` +
        `The Driver record may not be linked to this User account.`
      );
      throw new ForbiddenException("No active driver profile linked to this account.");
    }

    if (anyDriver.status !== DriverStatus.ACTIVE) {
      this.logger.error(
        `[resolveDriver] DENIED – Driver id=${anyDriver.id} exists for userId=${userId} ` +
        `but status is '${anyDriver.status}' (expected '${DriverStatus.ACTIVE}').`
      );
      throw new ForbiddenException("No active driver profile linked to this account.");
    }

    const driver = await this.prisma.driver.findFirst({
      where: { userId, status: DriverStatus.ACTIVE },
      include: { bus: true }
    });

    if (!driver) {
      // Should not happen after the checks above, but guard defensively.
      this.logger.error(
        `[resolveDriver] DENIED – Unexpected: driver lookup returned null ` +
        `after status check passed for userId=${userId}.`
      );
      throw new ForbiddenException("No active driver profile linked to this account.");
    }

    if (!driver.busId || !driver.bus) {
      this.logger.error(
        `[resolveDriver] DENIED – Driver id=${driver.id} is not assigned to any bus ` +
        `(busId=${driver.busId ?? 'null'}).`
      );
      throw new BadRequestException("Driver is not assigned to a bus.");
    }

    this.logger.log(
      `[resolveDriver] OK – userId=${userId} → driverId=${driver.id}, busId=${driver.busId}`
    );
    return driver;
  }

  private async createTrackingNotification(title: string, body: string, event: string) {
    await this.prisma.notification.create({
      data: {
        title,
        body,
        channel: "in-app",
        event,
        sentTo: "ADMIN"
      }
    });
  }

  private toKmh(speedMetersPerSecond?: number | null) {
    return speedMetersPerSecond === null || speedMetersPerSecond === undefined
      ? 0
      : speedMetersPerSecond * 3.6;
  }

  private getBusRuntimeStatus(
    speedMetersPerSecond?: number | null,
    lastUpdate?: Date | string | null
  ): BusRuntimeStatus {
    if (!lastUpdate) return "Offline";
    const updatedAt = lastUpdate instanceof Date ? lastUpdate : new Date(lastUpdate);
    if (Date.now() - updatedAt.getTime() > OFFLINE_AFTER_MS) return "Offline";
    return this.toKmh(speedMetersPerSecond) > MOVING_SPEED_KMH ? "Moving" : "Stopped";
  }

  private async markOfflineBuses(
    sessions: Array<{
      busId: string;
      bus: { busNumber: string };
      driver: { fullName: string };
      locations: Array<{ timestamp: Date; speed: number | null }>;
    }>
  ) {
    for (const session of sessions) {
      const latest = session.locations[0];
      const isOffline = this.getBusRuntimeStatus(latest?.speed, latest?.timestamp) === "Offline";
      const wasOffline = this.offlineState.get(session.busId) ?? false;

      if (isOffline && !wasOffline) {
        this.offlineState.set(session.busId, true);
        await this.createTrackingNotification(
          "Bus Offline",
          `Bus ${session.bus.busNumber} has not sent a GPS update for more than 2 minutes.`,
          "BUS_OFFLINE"
        );
        this.gateway.broadcastTrackingEvent("tracking-event", {
          type: "bus-offline",
          busId: session.busId,
          busNumber: session.bus.busNumber,
          driverName: session.driver.fullName,
          timestamp: new Date().toISOString()
        });
      }

      if (!isOffline && wasOffline) {
        this.offlineState.set(session.busId, false);
      }
    }
  }

  async startRoute(user: AuthUser) {
    if (user.role !== "DRIVER") {
      throw new ForbiddenException("Only drivers can start route tracking.");
    }

    const driver = await this.resolveDriver(user.id);
    const existing = await this.prisma.routeSession.findFirst({
      where: { driverId: driver.id, status: RouteSessionStatus.ACTIVE }
    });
    if (existing) {
      throw new BadRequestException("An active route session already exists.");
    }

    const session = await this.prisma.routeSession.create({
      data: {
        busId: driver.busId!,
        driverId: driver.id,
        status: RouteSessionStatus.ACTIVE
      },
      include: {
        bus: true,
        driver: true
      }
    });

    this.outsideAreaState.set(driver.busId!, false);
    this.offlineState.set(driver.busId!, false);

    const payload = {
      type: "route-started",
      sessionId: session.id,
      busId: session.busId,
      busNumber: session.bus.busNumber,
      driverName: session.driver.fullName,
      startTime: session.startTime.toISOString()
    };

    await this.createTrackingNotification(
      "Route Started",
      `${session.driver.fullName} started route on bus ${session.bus.busNumber}.`,
      "ROUTE_STARTED"
    );
    this.gateway.broadcastTrackingEvent("tracking-event", payload);

    return session;
  }

  async endRoute(user: AuthUser) {
    this.logger.log(
      `[endRoute] Called by userId=${user.id}, email=${user.email}, role='${user.role}'`
    );

    if (user.role !== "DRIVER") {
      this.logger.error(
        `[endRoute] DENIED – role check failed: got '${user.role}', expected 'DRIVER'. ` +
        `Check that the JWT was issued with the correct Role enum value.`
      );
      throw new ForbiddenException("Only drivers can end route tracking.");
    }

    const driver = await this.resolveDriver(user.id);
    const session = await this.prisma.routeSession.findFirst({
      where: { driverId: driver.id, status: RouteSessionStatus.ACTIVE },
      include: { bus: true, driver: true }
    });
    if (!session) {
      this.logger.error(
        `[endRoute] DENIED – No ACTIVE RouteSession found for driverId=${driver.id} (userId=${user.id}). ` +
        `The route may have already been ended or was never started.`
      );
      throw new NotFoundException("No active route session found.");
    }

    const updated = await this.prisma.routeSession.update({
      where: { id: session.id },
      data: {
        status: RouteSessionStatus.COMPLETED,
        endTime: new Date()
      },
      include: { bus: true, driver: true }
    });

    this.outsideAreaState.delete(session.busId);
    this.offlineState.delete(session.busId);

    const payload = {
      type: "route-ended",
      sessionId: updated.id,
      busId: updated.busId,
      busNumber: updated.bus.busNumber,
      driverName: updated.driver.fullName,
      endTime: updated.endTime?.toISOString()
    };

    await this.createTrackingNotification(
      "Route Ended",
      `${updated.driver.fullName} ended route on bus ${updated.bus.busNumber}.`,
      "ROUTE_ENDED"
    );
    this.gateway.broadcastTrackingEvent("tracking-event", payload);
    this.gateway.broadcastTrackingEvent("location-update", {
      busId: updated.busId,
      active: false
    });

    return updated;
  }

  async recordLocation(user: AuthUser, dto: LocationDto) {
    if (user.role !== "DRIVER") {
      throw new ForbiddenException("Only drivers can send GPS updates.");
    }

    const driver = await this.resolveDriver(user.id);
    const session = await this.prisma.routeSession.findFirst({
      where: { driverId: driver.id, status: RouteSessionStatus.ACTIVE },
      include: { bus: true, driver: true }
    });
    if (!session) {
      throw new BadRequestException("Start a route before sending GPS updates.");
    }

    const reportedAt = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const existingLocation = dto.timestamp
      ? await this.prisma.busLocation.findFirst({
          where: {
            routeSessionId: session.id,
            timestamp: reportedAt
          }
        })
      : null;

    const location = existingLocation ?? await this.prisma.busLocation.create({
      data: {
        busId: session.busId,
        driverId: driver.id,
        routeSessionId: session.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed ?? null,
        heading: dto.heading ?? null,
        accuracy: dto.accuracy ?? null,
        timestamp: reportedAt
      }
    });

    if (!existingLocation) {
      await this.checkGeofence(session.busId, driver.id, dto.latitude, dto.longitude);
      await this.checkPickupPoints(session, dto.latitude, dto.longitude);
    }

    const payload = {
      id: location.id,
      busId: session.busId,
      busNumber: session.bus.busNumber,
      driverName: session.driver.fullName,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      speedKmh: this.toKmh(location.speed),
      heading: location.heading,
      accuracy: location.accuracy,
      timestamp: location.timestamp.toISOString(),
      status: this.getBusRuntimeStatus(location.speed, location.timestamp),
      active: true
    };

    this.gateway.broadcastTrackingEvent("location-update", payload);
    return payload;
  }

  private async getOperatingPolygons(): Promise<LatLng[][]> {
    const areas = await this.prisma.operatingArea.findMany();
    return areas.map((area) => parsePolygon(area.polygon)).filter((polygon) => polygon.length >= 3);
  }

  private async checkGeofence(busId: string, driverId: string, lat: number, lng: number) {
    const polygons = await this.getOperatingPolygons();
    if (polygons.length === 0) return;

    const inside = isInsideAnyArea(lat, lng, polygons);
    const wasOutside = this.outsideAreaState.get(busId) ?? false;

    if (!inside && !wasOutside) {
      this.outsideAreaState.set(busId, true);
      const bus = await this.prisma.bus.findUnique({ where: { id: busId } });
      await this.prisma.geofenceViolation.create({
        data: { busId, driverId, latitude: lat, longitude: lng }
      });
      await this.createTrackingNotification(
        "Geofence Alert",
        `Bus ${bus?.busNumber ?? busId} left the allowed operating area.`,
        "GEOFENCE_VIOLATION"
      );
      this.gateway.broadcastTrackingEvent("geofence-alert", {
        busId,
        busNumber: bus?.busNumber,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString()
      });
    }

    if (inside && wasOutside) {
      this.outsideAreaState.set(busId, false);
    }
  }

  private async checkPickupPoints(
    session: { id: string; busId: string },
    lat: number,
    lng: number
  ) {
    const pickupPoints = await this.prisma.pickupPoint.findMany();
    for (const point of pickupPoints) {
      const distance = distanceMeters(lat, lng, point.latitude, point.longitude);
      const activeVisit = await this.prisma.pickupPointVisit.findFirst({
        where: {
          busId: session.busId,
          pickupPointId: point.id,
          departureTime: null
        }
      });

      if (distance <= point.radius && !activeVisit) {
        await this.prisma.pickupPointVisit.create({
          data: {
            busId: session.busId,
            pickupPointId: point.id,
            routeSessionId: session.id,
            arrivalTime: new Date()
          }
        });
      }

      if (distance > point.radius && activeVisit) {
        await this.prisma.pickupPointVisit.update({
          where: { id: activeVisit.id },
          data: { departureTime: new Date() }
        });
      }
    }
  }

  async getActiveRoutes() {
    const sessions = await this.prisma.routeSession.findMany({
      where: { status: RouteSessionStatus.ACTIVE },
      include: {
        bus: true,
        driver: true,
        locations: {
          orderBy: { timestamp: "desc" },
          take: 1
        }
      }
    });

    await this.markOfflineBuses(sessions);

    return sessions.map((session) => {
      const latest = session.locations[0];
      const status = this.getBusRuntimeStatus(latest?.speed, latest?.timestamp);
      return {
        sessionId: session.id,
        busId: session.busId,
        busNumber: session.bus.busNumber,
        driverName: session.driver.fullName,
        startTime: session.startTime.toISOString(),
        latitude: latest?.latitude ?? null,
        longitude: latest?.longitude ?? null,
        speed: latest?.speed ?? null,
        speedKmh: latest ? this.toKmh(latest.speed) : null,
        heading: latest?.heading ?? null,
        accuracy: latest?.accuracy ?? null,
        lastUpdate: latest?.timestamp.toISOString() ?? null,
        status
      };
    });
  }

  async getDashboardStats() {
    const activeSessions = await this.prisma.routeSession.findMany({
      where: { status: RouteSessionStatus.ACTIVE },
      include: {
        bus: true,
        driver: true,
        locations: { orderBy: { timestamp: "desc" }, take: 1 }
      }
    });

    await this.markOfflineBuses(activeSessions);

    const activeBusIds = activeSessions.map((session) => session.busId);
    const latestByBus = new Map(
      activeSessions.map((session) => [session.busId, session.locations[0]])
    );

    let movingBuses = 0;
    let stoppedBuses = 0;
    let offlineBuses = 0;
    for (const busId of activeBusIds) {
      const latest = latestByBus.get(busId);
      const status = this.getBusRuntimeStatus(latest?.speed, latest?.timestamp);
      if (status === "Moving") movingBuses += 1;
      if (status === "Stopped") stoppedBuses += 1;
      if (status === "Offline") offlineBuses += 1;
    }

    const outsideAreaBuses = [...this.outsideAreaState.values()].filter(Boolean).length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysTrips = await this.prisma.routeSession.count({
      where: { startTime: { gte: startOfToday } }
    });

    return {
      activeBuses: activeSessions.length,
      movingBuses,
      stoppedBuses,
      offlineBuses,
      outsideAreaBuses,
      todaysTrips
    };
  }

  async getDriverSession(user: AuthUser) {
    if (user.role !== "DRIVER") return null;
    const driver = await this.prisma.driver.findFirst({ where: { userId: user.id } });
    if (!driver) return null;

    return this.prisma.routeSession.findFirst({
      where: { driverId: driver.id, status: RouteSessionStatus.ACTIVE },
      include: { bus: true, driver: true }
    });
  }

  async getRouteHistory(period: "today" | "yesterday" | "last7days" | "last30days", busId?: string) {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (period === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === "yesterday") {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (period === "last7days") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const sessions = await this.prisma.routeSession.findMany({
      where: {
        startTime: { gte: start, lte: end },
        ...(busId ? { busId } : {})
      },
      include: {
        bus: true,
        driver: true,
        locations: { orderBy: { timestamp: "asc" } }
      },
      orderBy: { startTime: "desc" }
    });

    return sessions.map((session) => {
      let distanceMetersTotal = 0;
      for (let index = 1; index < session.locations.length; index += 1) {
        const previous = session.locations[index - 1];
        const current = session.locations[index];
        distanceMetersTotal += distanceMeters(
          previous.latitude,
          previous.longitude,
          current.latitude,
          current.longitude
        );
      }

      const routeEnd = session.endTime ?? session.locations.at(-1)?.timestamp ?? new Date();
      const durationSeconds = Math.max(
        0,
        Math.round((routeEnd.getTime() - session.startTime.getTime()) / 1000)
      );

      return {
        sessionId: session.id,
        busId: session.busId,
        busNumber: session.bus.busNumber,
        driverName: session.driver.fullName,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() ?? null,
        status: session.status,
        distanceKm: Number((distanceMetersTotal / 1000).toFixed(2)),
        durationSeconds,
        path: session.locations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          speedKmh: this.toKmh(loc.speed),
          timestamp: loc.timestamp.toISOString()
        }))
      };
    });
  }

  async reportGpsDenied(user: AuthUser) {
    if (user.role !== "DRIVER") {
      throw new ForbiddenException("Only drivers can report GPS permission status.");
    }

    const driver = await this.resolveDriver(user.id);
    await this.createTrackingNotification(
      "GPS Disabled",
      `${driver.fullName} could not start tracking because GPS permission was denied.`,
      "GPS_DISABLED"
    );
    this.gateway.broadcastTrackingEvent("tracking-event", {
      type: "gps-disabled",
      busId: driver.busId,
      busNumber: driver.bus?.busNumber,
      driverName: driver.fullName,
      timestamp: new Date().toISOString()
    });
    return { success: true };
  }

  async listTrackingLogs(busId?: string, driverId?: string, date?: string) {
    const start = date ? new Date(date) : undefined;
    const end = start ? new Date(start) : undefined;
    if (end) end.setDate(end.getDate() + 1);

    return this.prisma.busLocation.findMany({
      where: {
        ...(busId ? { busId } : {}),
        ...(driverId ? { driverId } : {}),
        ...(start && end ? { timestamp: { gte: start, lt: end } } : {})
      },
      include: { bus: true, driver: true },
      orderBy: { timestamp: "desc" },
      take: 500
    });
  }

  async listOperatingAreas() {
    return this.prisma.operatingArea.findMany({ orderBy: { name: "asc" } });
  }

  async createOperatingArea(dto: CreateOperatingAreaDto) {
    const existingCount = await this.prisma.operatingArea.count();
    if (existingCount >= 2) {
      throw new BadRequestException("Only two approved operating areas are allowed.");
    }
    return this.prisma.operatingArea.create({
      data: { name: dto.name, polygon: dto.polygon }
    });
  }

  async updateOperatingArea(id: string, dto: UpdateOperatingAreaDto) {
    return this.prisma.operatingArea.update({
      where: { id },
      data: { name: dto.name, polygon: dto.polygon }
    });
  }

  async deleteOperatingArea(id: string) {
    await this.prisma.operatingArea.delete({ where: { id } });
    return { success: true };
  }

  async listPickupPoints() {
    return this.prisma.pickupPoint.findMany({ orderBy: { name: "asc" } });
  }

  async createPickupPoint(dto: CreatePickupPointDto) {
    return this.prisma.pickupPoint.create({ data: dto });
  }

  async deletePickupPoint(id: string) {
    await this.prisma.pickupPoint.delete({ where: { id } });
    return { success: true };
  }

  async listViolations() {
    return this.prisma.geofenceViolation.findMany({
      include: {
        bus: true,
        driver: true
      },
      orderBy: { timestamp: "desc" },
      take: 50
    });
  }

  async listTrackingNotifications() {
    return this.prisma.notification.findMany({
      where: {
        event: {
          in: ["ROUTE_STARTED", "ROUTE_ENDED", "GEOFENCE_VIOLATION", "BUS_OFFLINE", "GPS_DISABLED"]
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }
}
