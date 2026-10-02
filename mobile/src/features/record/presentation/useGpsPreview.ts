import { useEffect, useState } from "react";
import * as Location from "expo-location";
import type { LatLng } from "../domain/geo";
import { MAX_ACCURACY_M } from "../domain/gpsFilter";

export type GpsQuality = "off" | "searching" | "good" | "ok" | "weak";

/** Qualidade do sinal pela precisão: ótimo até 10 m, bom até 30 m (o limite aceito), fraco acima. */
export function gpsQuality(accuracy: number | null | undefined): GpsQuality {
  if (accuracy == null) return "searching";
  if (accuracy <= 10) return "good";
  if (accuracy <= MAX_ACCURACY_M) return "ok";
  return "weak";
}

/**
 * Posição e qualidade do GPS antes de começar (tela de Gravar).
 * Só liga quando há permissão; não grava nada.
 */
export function useGpsPreview(enabled: boolean): { quality: GpsQuality; position: LatLng | null } {
  const [state, setState] = useState<{ quality: GpsQuality; position: LatLng | null }>({ quality: "searching", position: null });

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 0 }, (l) => {
      setState({
        quality: gpsQuality(l.coords.accuracy),
        position: { lat: l.coords.latitude, lng: l.coords.longitude },
      });
    })
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => !cancelled && setState({ quality: "off", position: null }));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return enabled ? state : { quality: "off", position: null };
}
