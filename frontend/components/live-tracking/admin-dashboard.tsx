"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bus, CircleDot, History, MapPinned, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, getBackendAuthSession } from "@/lib/api-client";
import { connectTrackingSocket, disconnectTrackingSocket } from "@/lib/live-tracking-socket";
import type { AreaPolygon, BusMarker, PickupPoint } from "@/components/live-tracking/tracking-map";

const TrackingMap = dynamic(() => import("@/components/live-tracking/tracking-map"), {
  ssr: false,
  loading: () => <div className="grid h-[520px] place-items-center rounded-lg border bg-slate-50 text-sm text-slate-500">Loading map...</div>
});

type DashboardStats = {
  activeBuses: number;
  movingBuses: number;
  stoppedBuses: number;
  offlineBuses: number;
  outsideAreaBuses: number;
  todaysTrips: number;
};

type ActiveBus = {
  busId: string;
  busNumber: string;
  driverName: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  speedKmh?: number | null;
  lastUpdate: string | null;
  status: "Moving" | "Stopped" | "Offline";
};

type RouteHistoryItem = {
  sessionId: string;
  busNumber: string;
  driverName: string;
  startTime: string;
  endTime: string | null;
  distanceKm: number;
  durationSeconds: number;
  path: Array<{ latitude: number; longitude: number }>;
};

type TrackingNotification = {
  id: string;
  title: string;
  body: string;
  event: string;
  createdAt: string;
};

export function AdminTrackingDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [operatingAreas, setOperatingAreas] = useState<AreaPolygon[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [alerts, setAlerts] = useState<TrackingNotification[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<"today" | "yesterday" | "last7days" | "last30days">("today");
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [drawMode, setDrawMode] = useState<"none" | "area" | "pickup">("none");
  const [draftPolygon, setDraftPolygon] = useState<Array<[number, number]>>([]);
  const [areaName, setAreaName] = useState("Region 1");
  const [pickupName, setPickupName] = useState("");
  const [pickupRadius, setPickupRadius] = useState("100");
  const [pickupDraft, setPickupDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [liveMarkers, setLiveMarkers] = useState<Record<string, BusMarker>>({});

  const loadData = useCallback(async () => {
    const authSession = getBackendAuthSession();
    if (!authSession) {
      setError("Backend authentication required: no valid JWT access token found. Log in with your admin account.");
      return;
    }
    if (authSession.role !== "ADMIN") {
      setError(`Backend authorization failed: Live Tracking requires ADMIN, but your JWT role is ${authSession.role}.`);
      return;
    }

    try {
      const [dashboard, active, areas, pickups, notifications, routeHistory] = await Promise.all([
        apiFetch<DashboardStats>("/live-tracking/dashboard"),
        apiFetch<ActiveBus[]>("/live-tracking/active"),
        apiFetch<AreaPolygon[]>("/live-tracking/operating-areas"),
        apiFetch<PickupPoint[]>("/live-tracking/pickup-points"),
        apiFetch<TrackingNotification[]>("/live-tracking/notifications"),
        apiFetch<RouteHistoryItem[]>(`/live-tracking/history?period=${historyPeriod}`)
      ]);

      setStats(dashboard);
      setActiveBuses(active);
      setOperatingAreas(areas);
      setPickupPoints(pickups);
      setAlerts(notifications);
      setHistory(routeHistory);
      setError("");
      setLiveMarkers(
        active
          .filter((bus) => bus.latitude !== null && bus.longitude !== null)
          .reduce<Record<string, BusMarker>>((acc, bus) => {
            acc[bus.busId] = {
              busId: bus.busId,
              busNumber: bus.busNumber,
              driverName: bus.driverName,
              latitude: bus.latitude!,
              longitude: bus.longitude!,
              speed: bus.speed,
              speedKmh: bus.speedKmh ?? (bus.speed !== null ? bus.speed * 3.6 : null),
              timestamp: bus.lastUpdate ?? new Date().toISOString()
            };
            return acc;
          }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live tracking data.");
    }
  }, [historyPeriod]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const authSession = getBackendAuthSession();
    if (!authSession || authSession.role !== "ADMIN") return;

    const socket = connectTrackingSocket();
    socket.emit("join-tracking");

    socket.on("location-update", (payload: BusMarker & { active?: boolean; status?: ActiveBus["status"] }) => {
      if (payload.active === false) {
        setLiveMarkers((current) => {
          const next = { ...current };
          delete next[payload.busId];
          return next;
        });
        setActiveBuses((current) => current.filter((bus) => bus.busId !== payload.busId));
        void loadData();
        return;
      }

      setLiveMarkers((current) => ({
        ...current,
        [payload.busId]: {
          busId: payload.busId,
          busNumber: payload.busNumber,
          driverName: payload.driverName,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          speedKmh: payload.speedKmh ?? (payload.speed !== null ? payload.speed * 3.6 : null),
          timestamp: payload.timestamp
        }
      }));
      setActiveBuses((current) => {
        const nextBus: ActiveBus = {
          busId: payload.busId,
          busNumber: payload.busNumber,
          driverName: payload.driverName,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          speedKmh: payload.speedKmh ?? (payload.speed !== null ? payload.speed * 3.6 : null),
          lastUpdate: payload.timestamp,
          status: payload.status ?? "Stopped"
        };
        const exists = current.some((bus) => bus.busId === payload.busId);
        return exists
          ? current.map((bus) => (bus.busId === payload.busId ? { ...bus, ...nextBus } : bus))
          : [nextBus, ...current];
      });
    });

    socket.on("tracking-event", () => {
      void loadData();
    });

    socket.on("geofence-alert", () => {
      void loadData();
    });

    return () => {
      disconnectTrackingSocket();
    };
  }, [loadData]);

  const mapBuses = useMemo(() => Object.values(liveMarkers), [liveMarkers]);

  function relativeLastUpdate(value: string | null) {
    if (!value) return "Waiting for GPS";
    const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds} seconds ago`;
    return `${Math.round(seconds / 60)} minutes ago`;
  }

  const selectedRoutePath = useMemo(() => {
    const route = history.find((item) => item.sessionId === selectedHistoryId);
    return route?.path ?? [];
  }, [history, selectedHistoryId]);

  function handleMapClick(lat: number, lng: number) {
    if (drawMode === "area") {
      setDraftPolygon((current) => [...current, [lat, lng]]);
    }
    if (drawMode === "pickup") {
      setPickupDraft({ lat, lng });
    }
  }

  async function saveOperatingArea() {
    if (draftPolygon.length < 3) {
      setError("Draw at least 3 points to create an operating area.");
      return;
    }
    try {
      await apiFetch("/live-tracking/operating-areas", {
        method: "POST",
        body: JSON.stringify({
          name: areaName,
          polygon: draftPolygon.map(([lat, lng]) => [lat, lng])
        })
      });
      setDraftPolygon([]);
      setDrawMode("none");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save operating area.");
    }
  }

  async function savePickupPoint() {
    if (!pickupDraft || !pickupName.trim()) {
      setError("Click the map and enter a pickup point name.");
      return;
    }
    try {
      await apiFetch("/live-tracking/pickup-points", {
        method: "POST",
        body: JSON.stringify({
          name: pickupName.trim(),
          latitude: pickupDraft.lat,
          longitude: pickupDraft.lng,
          radius: Number(pickupRadius)
        })
      });
      setPickupDraft(null);
      setPickupName("");
      setDrawMode("none");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pickup point.");
    }
  }

  async function deleteArea(id: string) {
    await apiFetch(`/live-tracking/operating-areas/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function deletePickup(id: string) {
    await apiFetch(`/live-tracking/pickup-points/${id}`, { method: "DELETE" });
    await loadData();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Active Buses", value: stats?.activeBuses ?? 0, icon: Bus },
          { label: "Moving Buses", value: stats?.movingBuses ?? 0, icon: Bus },
          { label: "Stopped Buses", value: stats?.stoppedBuses ?? 0, icon: CircleDot },
          { label: "Offline Buses", value: stats?.offlineBuses ?? 0, icon: AlertTriangle },
          { label: "Outside Area Buses", value: stats?.outsideAreaBuses ?? 0, icon: AlertTriangle },
          { label: "Today's Trips", value: stats?.todaysTrips ?? 0, icon: History }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="text-xl font-black">{item.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_420px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b p-4 dark:border-slate-800">
            <div>
              <CardTitle className="text-base">Live Map</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Realtime bus movement, operating areas, pickup points, and route replay.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={drawMode === "area" ? "default" : "outline"} onClick={() => setDrawMode(drawMode === "area" ? "none" : "area")}>
                Draw Area
              </Button>
              <Button size="sm" variant={drawMode === "pickup" ? "default" : "outline"} onClick={() => setDrawMode(drawMode === "pickup" ? "none" : "pickup")}>
                Add Pickup
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-[640px] overflow-hidden rounded-lg border bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <TrackingMap
                buses={mapBuses}
                operatingAreas={operatingAreas}
                pickupPoints={pickupPoints}
                routePath={selectedRoutePath}
                drawMode={drawMode}
                draftPolygon={draftPolygon}
                onMapClick={handleMapClick}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b p-4 dark:border-slate-800">
              <div>
                <CardTitle className="text-base">Active Buses</CardTitle>
                <p className="mt-1 text-xs text-slate-500">Driver, speed, route status, and GPS freshness.</p>
              </div>
            </CardHeader>
            <CardContent className="max-h-[430px] space-y-3 overflow-y-auto p-4">
              {activeBuses.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-slate-500 dark:border-slate-800">No active routes right now.</p>
              ) : (
                activeBuses.map((bus) => (
                  <div key={bus.busId} className="rounded-lg border bg-white p-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                          <Bus className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{bus.busNumber}</div>
                          <div className="text-xs text-slate-500">Driver: {bus.driverName}</div>
                        </div>
                      </div>
                      <Badge className={bus.status === "Moving" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : bus.status === "Stopped" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                        {bus.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-950">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {bus.speedKmh !== null && bus.speedKmh !== undefined ? `${bus.speedKmh.toFixed(1)} km/h` : "-"}
                        </div>
                        <div className="text-slate-500">Speed</div>
                      </div>
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-950">
                        <div className="truncate font-bold text-slate-900 dark:text-white">{relativeLastUpdate(bus.lastUpdate)}</div>
                        <div className="text-slate-500">Last update</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b p-4 dark:border-slate-800">
              <CardTitle className="text-base">Alerts</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[200px] space-y-2 overflow-y-auto p-4">
              {alerts.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-center text-sm font-medium text-slate-500 dark:border-slate-800">No tracking alerts yet.</p>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-lg border bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="font-bold text-slate-900 dark:text-white">{alert.title}</div>
                    <div className="text-slate-500">{alert.body}</div>
                    <div className="mt-1 text-xs text-slate-400">{new Date(alert.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Operating Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex gap-2">
              <Input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="Region 1" />
              <Button onClick={saveOperatingArea}>Save Area</Button>
            </div>
            <p className="text-xs text-slate-500">Click the map to add polygon points, then save Region 1 or Region 2.</p>
            {operatingAreas.map((area) => (
              <div key={area.id} className="flex items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{area.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteArea(area.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Pickup Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
              <Input value={pickupName} onChange={(event) => setPickupName(event.target.value)} placeholder="Pickup name" />
              <Input value={pickupRadius} onChange={(event) => setPickupRadius(event.target.value)} placeholder="Radius m" />
              <Button onClick={savePickupPoint}>Save</Button>
            </div>
            {pickupDraft && (
              <p className="text-xs text-slate-500">
                Selected: {pickupDraft.lat.toFixed(5)}, {pickupDraft.lng.toFixed(5)}
              </p>
            )}
            {pickupPoints.map((point) => (
              <div key={point.id} className="flex items-center justify-between rounded-md border p-3 text-sm dark:border-slate-800">
                <div>
                  <div className="font-semibold">{point.name}</div>
                  <div className="text-xs text-slate-500">Radius {point.radius}m</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deletePickup(point.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Route History</CardTitle>
          <div className="flex flex-wrap gap-2">
            {(["today", "yesterday", "last7days", "last30days"] as const).map((period) => (
              <Button
                key={period}
                size="sm"
                variant={historyPeriod === period ? "default" : "outline"}
                onClick={() => setHistoryPeriod(period)}
              >
                {period === "today" ? "Today" : period === "yesterday" ? "Yesterday" : period === "last7days" ? "Last 7 Days" : "Last 30 Days"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No routes found for this period.</p>
          ) : (
            history.map((route) => (
              <button
                key={route.sessionId}
                type="button"
                onClick={() => setSelectedHistoryId(route.sessionId)}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors dark:border-slate-800 ${
                  selectedHistoryId === route.sessionId ? "border-blue-500 bg-blue-50 dark:bg-slate-900" : ""
                }`}
              >
                <div>
                  <div className="font-semibold">{route.busNumber} - {route.driverName}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(route.startTime).toLocaleString()} - {route.path.length} points
                  </div>
                  <div className="text-xs text-slate-500">
                    {route.distanceKm.toFixed(2)} km - {Math.round(route.durationSeconds / 60)} min
                  </div>
                </div>
                <History className="h-4 w-4 text-slate-400" />
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
