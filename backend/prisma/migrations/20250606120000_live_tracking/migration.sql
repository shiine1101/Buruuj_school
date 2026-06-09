-- CreateEnum
CREATE TYPE "RouteSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "RouteSession" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "RouteSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusLocation" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routeSessionId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "polygon" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceViolation" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GeofenceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupPointVisit" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "pickupPointId" TEXT NOT NULL,
    "routeSessionId" TEXT,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "departureTime" TIMESTAMP(3),

    CONSTRAINT "PickupPointVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteSession_busId_status_idx" ON "RouteSession"("busId", "status");
CREATE INDEX "RouteSession_driverId_status_idx" ON "RouteSession"("driverId", "status");
CREATE INDEX "RouteSession_startTime_idx" ON "RouteSession"("startTime");
CREATE INDEX "BusLocation_busId_timestamp_idx" ON "BusLocation"("busId", "timestamp");
CREATE INDEX "BusLocation_routeSessionId_timestamp_idx" ON "BusLocation"("routeSessionId", "timestamp");
CREATE INDEX "GeofenceViolation_busId_timestamp_idx" ON "GeofenceViolation"("busId", "timestamp");
CREATE INDEX "PickupPointVisit_busId_pickupPointId_idx" ON "PickupPointVisit"("busId", "pickupPointId");
CREATE INDEX "PickupPointVisit_routeSessionId_idx" ON "PickupPointVisit"("routeSessionId");

-- AddForeignKey
ALTER TABLE "RouteSession" ADD CONSTRAINT "RouteSession_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RouteSession" ADD CONSTRAINT "RouteSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusLocation" ADD CONSTRAINT "BusLocation_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusLocation" ADD CONSTRAINT "BusLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusLocation" ADD CONSTRAINT "BusLocation_routeSessionId_fkey" FOREIGN KEY ("routeSessionId") REFERENCES "RouteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeofenceViolation" ADD CONSTRAINT "GeofenceViolation_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeofenceViolation" ADD CONSTRAINT "GeofenceViolation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupPointVisit" ADD CONSTRAINT "PickupPointVisit_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupPointVisit" ADD CONSTRAINT "PickupPointVisit_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupPointVisit" ADD CONSTRAINT "PickupPointVisit_routeSessionId_fkey" FOREIGN KEY ("routeSessionId") REFERENCES "RouteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
