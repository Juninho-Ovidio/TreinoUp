import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { recorder } from "./recorderInstance";
import { toLocationEvent, type LocationAccess, type TrackingTexts } from "./locationTypes";

/**
 * GPS da gravação no celular.
 * - Com permissão "o tempo todo": tarefa em segundo plano (Android com serviço em primeiro plano e
 *   notificação fixa; iOS com indicador azul). Continua com a tela bloqueada.
 * - Só "durante o uso": acompanha com o app aberto (a tela pede para ficar ligada).
 */

export const LOCATION_TASK = "treinoup-recording-location";

// Precisa ser definida no carregamento do app (o layout raiz importa este arquivo).
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await recorder.dispatch(data.locations.map(toLocationEvent));
});

let foregroundSub: Location.LocationSubscription | null = null;

export async function currentAccess(): Promise<LocationAccess> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) return "denied";
  const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
  return bg?.granted ? "background" : "foreground";
}

/** Pede a permissão de uso e, se der, a de segundo plano (no Android é um segundo pedido). */
export async function requestAccess(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return "denied";
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  return bg?.granted ? "background" : "foreground";
}

export async function isTracking(): Promise<boolean> {
  if (foregroundSub) return true;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
}

export async function startTracking(access: LocationAccess, texts: TrackingTexts): Promise<void> {
  if (access === "denied" || (await isTracking())) return;
  if (access === "background") {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: texts.notificationTitle,
        notificationBody: texts.notificationBody,
        notificationColor: "#E8A33D",
        killServiceOnDestroy: false,
      },
    });
    return;
  }
  foregroundSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (l) => {
      recorder.dispatch([toLocationEvent(l)]);
    },
  );
}

export async function stopTracking(): Promise<void> {
  foregroundSub?.remove();
  foregroundSub = null;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

/** Abre os ajustes do app (quando a permissão foi negada de vez). */
export { openSettings } from "./openSettings";

export const supportsBackground = Platform.OS !== "web";
