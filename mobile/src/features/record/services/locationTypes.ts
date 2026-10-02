import type { LocationObject } from "expo-location";
import type { RecordingEvent } from "../domain/session";

/** Resultado do pedido de permissão: grava com tela bloqueada, só com o app aberto, ou não grava. */
export type LocationAccess = "background" | "foreground" | "denied";

export function toLocationEvent(l: LocationObject): RecordingEvent {
  return {
    type: "location",
    fix: {
      t: l.timestamp,
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      alt: l.coords.altitude ?? null,
      accuracy: l.coords.accuracy ?? null,
      speed: l.coords.speed ?? null,
    },
  };
}

export interface TrackingTexts {
  notificationTitle: string;
  notificationBody: string;
}
