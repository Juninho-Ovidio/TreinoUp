import { Stack } from "expo-router";
import { useTheme } from "@/design-system";
import { needsRunOnboarding } from "@/features/auth/domain/gate";
import { useMyProfile } from "@/features/profile/presentation/useProfile";

/** TreinoUp Run: na primeira entrada pede o @usuário; depois abre as abas. */
export default function RunLayout() {
  const { colors } = useTheme();
  const profile = useMyProfile().data;
  const onboarding = needsRunOnboarding(profile);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={onboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarding}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
      </Stack.Protected>
    </Stack>
  );
}
