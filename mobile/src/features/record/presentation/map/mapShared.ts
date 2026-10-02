import type { StyleProp, ViewStyle } from "react-native";
import type { LatLng } from "../../domain/geo";

/** Estilos gratuitos (sem chave) do OpenFreeMap. Troque por MapTiler/Mapbox via .env se quiser. */
export const MAP_STYLE = {
  light: process.env.EXPO_PUBLIC_MAP_STYLE_LIGHT || "https://tiles.openfreemap.org/styles/positron",
  dark: process.env.EXPO_PUBLIC_MAP_STYLE_DARK || "https://tiles.openfreemap.org/styles/dark",
};

export interface RouteMapProps {
  /** Pontos do percurso; `segment` separa os trechos entre pausas. */
  points: readonly (LatLng & { segment?: number })[];
  /** Posição atual (pontinho azul). */
  current?: LatLng | null;
  /** Câmera acompanha a posição atual; senão enquadra o percurso todo. */
  follow?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Percurso como MultiLineString (um trecho por segmento). */
export function routeGeoJSON(points: RouteMapProps["points"]): GeoJSON.Feature<GeoJSON.MultiLineString> {
  const lines: number[][][] = [];
  let seg: number | undefined;
  for (const p of points) {
    if (!lines.length || p.segment !== seg) {
      lines.push([]);
      seg = p.segment;
    }
    lines[lines.length - 1]!.push([p.lng, p.lat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines.filter((l) => l.length > 1) } };
}

export function pointGeoJSON(p: LatLng): GeoJSON.Feature<GeoJSON.Point> {
  return { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
}

/** São Paulo, para quando ainda não há posição. */
export const DEFAULT_CENTER: LatLng = { lat: -23.5505, lng: -46.6333 };
