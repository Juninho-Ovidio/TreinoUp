import { Stack } from "expo-router";
import { useTheme } from "@/design-system";

export const unstable_settings = { initialRouteName: "welcome" };

export default function AuthGroupLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
