"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, MapPin, Navigation, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, getBackendAuthSession } from "@/lib/api-client";
import { useDriverGpsTracking } from "@/components/live-tracking/use-driver-gps";

type DriverSession = {
  id: string;
  bus: { busNumber: string };
  driver: { fullName: string };
  startTime: string;
};

export function DriverTrackingPanel() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [tracking, setTracking] = useState(false);

  const loadSession = useCallback(async () => {
    const authSession = getBackendAuthSession();
    if (!authSession) {
      setError("Backend authentication required: no valid JWT access token found. Log in with your driver account.");
      return;
    }
    if (authSession.role !== "DRIVER") {
      setError(`Backend authorization failed: Live Tracking requires DRIVER, but your JWT role is ${authSession.role}.`);
      return;
    }
    try {
      const data = await apiFetch<DriverSession | null>("/live-tracking/driver-session");
      setSession(data);
      setTracking(Boolean(data));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load driver session.");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useDriverGpsTracking(tracking, setGpsError);

  async function startRoute() {
    setLoading(true);
    setError("");
    setGpsError("");

    if (!navigator.geolocation) {
      setError("GPS is not supported on this device.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const data = await apiFetch<DriverSession>("/live-tracking/start-route", { method: "POST" });
          setSession(data);
          setTracking(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to start route.");
        } finally {
          setLoading(false);
        }
      },
      async (positionError) => {
        setError(`GPS permission denied: ${positionError.message}`);
        try {
          await apiFetch("/live-tracking/gps-denied", { method: "POST" });
        } catch {
          // The local permission error is the important message for the driver.
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function endRoute() {
    setLoading(true);
    setError("");
    try {
      await apiFetch("/live-tracking/end-route", { method: "POST" });
      setSession(null);
      setTracking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Driver Route Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <p className="text-sm text-slate-500">
            Start route to begin real GPS tracking from this device. Location updates are sent every 5 seconds.
          </p>

          <div className="rounded-md border bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-bold uppercase text-slate-400">Bus Information</div>
            {session ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">Assigned Bus</div>
                  <div className="font-semibold">{session.bus.busNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Driver</div>
                  <div className="font-semibold">{session.driver.fullName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Current Status</div>
                  <div className="font-semibold text-emerald-600">Tracking Active</div>
                </div>
                <div className="text-xs text-slate-400 sm:col-span-3">
                  Started {new Date(session.startTime).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Assigned Bus</div>
                  <div className="font-semibold">Available after driver login</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Current Status</div>
                  <div className="font-semibold text-slate-600">Not tracking</div>
                </div>
              </div>
            )}
          </div>

          {(error || gpsError) && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || gpsError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!tracking ? (
              <Button onClick={startRoute} disabled={loading} className="gap-2">
                <Navigation className="h-4 w-4" />
                Start Route
              </Button>
            ) : (
              <Button onClick={endRoute} disabled={loading} variant="outline" className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50">
                <Square className="h-4 w-4" />
                End Route
              </Button>
            )}
          </div>

          {tracking && (
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <MapPin className="h-4 w-4" />
              Live GPS tracking active on this device
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
