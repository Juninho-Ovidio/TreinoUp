import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from "@maplibre/maplibre-react-native";
import { useTheme } from "@/design-system";
import { bounds } from "../../domain/geo";
import { DEFAULT_CENTER, MAP_STYLE, pointGeoJSON, routeGeoJSON, type RouteMapProps } from "./mapShared";

/** Mapa do percurso no celular (MapLibre nativo). */
export function RouteMap({ points, current, follow = false, interactive = true, style, accessibilityLabel }: RouteMapProps) {
  const { scheme, colors } = useTheme();
  const camera = useRef<CameraRef>(null);
  const route = useMemo(() => routeGeoJSON(points), [points]);
  const start = current ?? points[0] ?? DEFAULT_CENTER;

  useEffect(() => {
    if (follow && current) {
      camera.current?.easeTo({ center: [current.lng, current.lat], duration: 600 });
      return;
    }
    const b = bounds(points);
    if (!follow && b && points.length > 1) {
      camera.current?.fitBounds([b[0][0], b[0][1], b[1][0], b[1][1]], { padding: { top: 40, bottom: 40, left: 40, right: 40 }, duration: 0 });
    }
  }, [follow, current, points]);

  return (
    <View style={[styles.wrap, style]} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={scheme === "dark" ? MAP_STYLE.dark : MAP_STYLE.light}
        logo={false}
        compass={false}
        attribution
        dragPan={interactive}
        touchZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        doubleTapZoom={interactive}
      >
        <Camera ref={camera} initialViewState={{ center: [start.lng, start.lat], zoom: 15 }} />
        <GeoJSONSource id="route" data={route}>
          <Layer
            type="line"
            id="route-casing"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": colors.routeCasing, "line-width": 8, "line-opacity": 0.85 }}
          />
          <Layer
            type="line"
            id="route-line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": colors.route, "line-width": 5 }}
          />
        </GeoJSONSource>
        {current ? (
          <GeoJSONSource id="me" data={pointGeoJSON(current)}>
            <Layer type="circle" id="me-halo" paint={{ "circle-radius": 14, "circle-color": "#3A8DFF", "circle-opacity": 0.2 }} />
            <Layer
              type="circle"
              id="me-dot"
              paint={{ "circle-radius": 6, "circle-color": "#3A8DFF", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
