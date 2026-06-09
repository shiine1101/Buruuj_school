"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";

type GpsPayload = {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
};

export function useDriverGpsTracking(active: boolean, onError?: (message: string) => void) {
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const watchId = useRef<number | null>(null);
  const pendingUpdates = useRef<GpsPayload[]>([]);
  const lastQueuedTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const buildPayload = (position: GeolocationPosition): GpsPayload => {
      const payload: GpsPayload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString()
      };

      if (position.coords.speed !== null && !Number.isNaN(position.coords.speed)) {
        payload.speed = position.coords.speed;
      }
      if (position.coords.heading !== null && !Number.isNaN(position.coords.heading)) {
        payload.heading = position.coords.heading;
      }

      return payload;
    };

    const queueLatestPosition = () => {
      const position = latestPosition.current;
      if (!position || lastQueuedTimestamp.current === position.timestamp) return;
      pendingUpdates.current.push(buildPayload(position));
      pendingUpdates.current = pendingUpdates.current.slice(-120);
      lastQueuedTimestamp.current = position.timestamp;
    };

    const flushPendingUpdates = async () => {
      while (pendingUpdates.current.length > 0) {
        const [payload] = pendingUpdates.current;
        try {
          await apiFetch("/live-tracking/location", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          pendingUpdates.current.shift();
        } catch (error) {
          onError?.(error instanceof Error ? error.message : "Failed to send GPS update.");
          break;
        }
      }
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        latestPosition.current = position;
      },
      (error) => {
        onError?.(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    const interval = window.setInterval(async () => {
      queueLatestPosition();
      await flushPendingUpdates();
    }, 5000);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      window.clearInterval(interval);
    };
  }, [active, onError]);
}
