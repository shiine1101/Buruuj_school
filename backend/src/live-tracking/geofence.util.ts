export type LatLng = { lat: number; lng: number };

export function isPointInPolygon(lat: number, lng: number, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideAnyArea(lat: number, lng: number, areas: LatLng[][]): boolean {
  if (areas.length === 0) return true;
  return areas.some((polygon) => isPointInPolygon(lat, lng, polygon));
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parsePolygon(raw: unknown): LatLng[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        return { lat: Number(point[0]), lng: Number(point[1]) };
      }
      if (point && typeof point === "object" && "lat" in point && "lng" in point) {
        return { lat: Number((point as LatLng).lat), lng: Number((point as LatLng).lng) };
      }
      return null;
    })
    .filter((point): point is LatLng => point !== null && !Number.isNaN(point.lat) && !Number.isNaN(point.lng));
}
