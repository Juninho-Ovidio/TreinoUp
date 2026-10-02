import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Toque leve de confirmação (abas, botões principais). Silencioso onde não há vibração. */
export function tap() {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
