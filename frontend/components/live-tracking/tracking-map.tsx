"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type BusMarker = {
  busId: string;
  busNumber: string;
  driverName: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  speedKmh?: number | null;
  timestamp: string;
};

export type AreaPolygon = {
  id: string;
  name: string;
  polygon: number[][];
};

export type PickupPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

type TrackingMapProps = {
  buses: BusMarker[];
  routePath?: Array<{ latitude: number; longitude: number }>;
  operatingAreas: AreaPolygon[];
  pickupPoints: PickupPoint[];
  center?: [number, number];
  zoom?: number;
  drawMode?: "none" | "area" | "pickup";
  draftPolygon?: Array<[number, number]>;
  onMapClick?: (lat: number, lng: number) => void;
};

const busIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;color:white;border:2px solid white;border-radius:9999px;width:28px;height:28px;display:grid;place-items:center;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.25)">B</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function MapClickHandler({
  enabled,
  onMapClick
}: {
  enabled: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled || !onMapClick) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

function LiveBusMarker({ bus }: { bus: BusMarker }) {
  const markerRef = useRef<L.Marker>(null);
  const speedKmh = bus.speedKmh ?? (bus.speed !== null ? bus.speed * 3.6 : null);

  useEffect(() => {
    markerRef.current?.setLatLng([bus.latitude, bus.longitude]);
  }, [bus.latitude, bus.longitude]);

  return (
    <Marker
      ref={markerRef}
      position={[bus.latitude, bus.longitude]}
      icon={busIcon}
    >
      <Popup>
        <div className="space-y-1 text-sm">
          <div className="font-semibold">{bus.busNumber}</div>
          <div>Driver: {bus.driverName}</div>
          <div>Speed: {speedKmh !== null ? `${speedKmh.toFixed(1)} km/h` : "-"}</div>
          <div>Last Update: {new Date(bus.timestamp).toLocaleTimeString()}</div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function TrackingMap({
  buses,
  routePath = [],
  operatingAreas,
  pickupPoints,
  center = [2.0469, 45.3182],
  zoom = 13,
  drawMode = "none",
  draftPolygon = [],
  onMapClick
}: TrackingMapProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
    });
  }, []);

  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full rounded-lg" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler enabled={drawMode !== "none"} onMapClick={onMapClick} />

      {operatingAreas.map((area) => (
        <Polygon
          key={area.id}
          positions={area.polygon.map(([lat, lng]) => [lat, lng] as [number, number])}
          pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 2 }}
        />
      ))}

      {draftPolygon.length >= 2 && (
        <Polygon
          positions={draftPolygon}
          pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 0.15, dashArray: "6 6" }}
        />
      )}

      {pickupPoints.map((point) => (
        <Circle
          key={point.id}
          center={[point.latitude, point.longitude]}
          radius={point.radius}
          pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.12 }}
        />
      ))}

      {routePath.length > 1 && (
        <Polyline
          positions={routePath.map((point) => [point.latitude, point.longitude] as [number, number])}
          pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.85 }}
        />
      )}

      {buses.map((bus) => (
        <LiveBusMarker key={bus.busId} bus={bus} />
      ))}
    </MapContainer>
  );
}
