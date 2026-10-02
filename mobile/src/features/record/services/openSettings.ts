import { Linking, Platform } from "react-native";

/** Abre os ajustes do app no aparelho (para liberar a localização depois de negar). */
export function openSettings() {
  if (Platform.OS === "web") return;
  Linking.openSettings().catch(() => {});
}
