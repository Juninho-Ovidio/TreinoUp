import { Stack } from "expo-router";
import { useTheme } from "@/design-system";

export const unstable_settings = { initialRouteName: "index" };

/** Área logada do TreinoUp. O TreinoUp Run fica em /run e se abre pelo botão da tela inicial. */
export default function AppGroupLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="run" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
