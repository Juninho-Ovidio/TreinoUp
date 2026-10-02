import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Map as MlMap, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Constants from "expo-constants";
import { useTheme } from "@/design-system";
import { bounds } from "../../domain/geo";
import { DEFAULT_CENTER, MAP_STYLE, pointGeoJSON, routeGeoJSON, type RouteMapProps } from "./mapShared";

// O worker é servido de public/maplibre (copiado no postinstall; veja scripts/copy-maplibre-worker.mjs).
// Com o app publicado em uma subpasta (ex.: /app no site), o worker fica nela também.
const BASE = (Constants.expoConfig?.experiments?.baseUrl ?? "").replace(/\/+$/, "");
setWorkerUrl(new URL(`${BASE}/maplibre/maplibre-gl-worker.mjs`, window.location.origin).href);

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Mapa do percurso no navegador (MapLibre GL JS), com a mesma interface do mapa nativo. */
export function RouteMap({ points, current, follow = false, interactive = true, style, accessibilityLabel }: RouteMapProps) {
  const { scheme, colors } = useTheme();
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const route = useMemo(() => routeGeoJSON(points), [points]);
  const styleUrl = scheme === "dark" ? MAP_STYLE.dark : MAP_STYLE.light;

  // Cria o mapa (e recria ao trocar o tema).
  useEffect(() => {
    if (!container.current) return;
    const start = current ?? points[0] ?? DEFAULT_CENTER;
    const m = new MlMap({
      container: container.current,
      style: styleUrl,
      center: [start.lng, start.lat],
      zoom: 15,
      interactive,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.on("load", () => {
      m.addSource("route", { type: "geojson", data: EMPTY });
      m.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": colors.routeCasing, "line-width": 8, "line-opacity": 0.85 },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": colors.route, "line-width": 5 },
      });
      m.addSource("me", { type: "geojson", data: EMPTY });
      m.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 14, "circle-color": "#3A8DFF", "circle-opacity": 0.2 } });
      m.addLayer({
        id: "me-dot",
        type: "circle",
        source: "me",
        paint: { "circle-radius": 6, "circle-color": "#3A8DFF", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 },
      });
      // Créditos do mapa começam recolhidos (o "i" abre).
      container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      ready.current = true;
    });
    return () => {
      ready.current = false;
      m.remove();
      map.current = null;
    };
    // O mapa só é recriado quando o estilo muda; os dados entram pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl, interactive]);

  // Atualiza percurso, posição e câmera.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      (m.getSource("route") as GeoJSONSource | undefined)?.setData(route);
      (m.getSource("me") as GeoJSONSource | undefined)?.setData(current ? pointGeoJSON(current) : EMPTY);
      if (follow && current) m.easeTo({ center: [current.lng, current.lat], duration: 600 });
      else {
        const b = bounds(points);
        if (b && points.length > 1) m.fitBounds(b, { padding: 40, duration: 0 });
      }
    };
    if (ready.current) apply();
    // O "load" registrado na criação (que adiciona as camadas) roda antes deste.
    else m.once("load", apply);
  }, [route, current, follow, points, styleUrl]);

  return (
    <View style={[styles.wrap, style]} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
