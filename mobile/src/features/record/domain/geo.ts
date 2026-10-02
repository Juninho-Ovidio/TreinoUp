/** Geodésia básica para a gravação. */

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distância em metros entre dois pontos (haversine). Erro < 0,5% para trechos de corrida/bike. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ponto a `meters` de distância no rumo `bearingDeg` (usado para gerar trajetos de teste). */
export function offset(from: LatLng, meters: number, bearingDeg: number): LatLng {
  const d = meters / EARTH_RADIUS_M;
  const br = rad(bearingDeg);
  const lat1 = rad(from.lat);
  const lng1 = rad(from.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lng2 = lng1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/** Caixa que envolve os pontos: [[oeste, sul], [leste, norte]]. */
export function bounds(points: readonly LatLng[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
