import * as Location from "expo-location";
import { recorder } from "./recorderInstance";
import { toLocationEvent, type LocationAccess, type TrackingTexts } from "./locationTypes";

/**
 * No navegador não há tarefa em segundo plano: o GPS só é lido com a aba aberta.
 * Serve para testar a gravação no computador/celular pelo navegador.
 */

let sub: Location.LocationSubscription | null = null;

export async function currentAccess(): Promise<LocationAccess> {
  const fg = await Location.getForegroundPermissionsAsync().catch(() => null);
  return fg?.granted ? "foreground" : "denied";
}

export async function requestAccess(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync().catch(() => null);
  return fg?.granted ? "foreground" : "denied";
}

export async function isTracking(): Promise<boolean> {
  return sub != null;
}

export async function startTracking(access: LocationAccess, _texts: TrackingTexts): Promise<void> {
  if (access === "denied" || sub) return;
  sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (l) => {
    recorder.dispatch([toLocationEvent(l)]);
  });
}

export async function stopTracking(): Promise<void> {
  sub?.remove();
  sub = null;
}

export { openSettings } from "./openSettings";

export const supportsBackground = false;
