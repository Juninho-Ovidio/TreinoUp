import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppBackground, Button, EmptyState, ThemeProvider, ToastProvider, useTheme } from "@/design-system";
import { fontAssets } from "@/design-system/fonts";
import { resolveGate } from "@/features/auth/domain/gate";
import { usePendingRedirect } from "@/features/auth/presentation/pendingRedirect";
import { startSessionListener, useSession } from "@/features/auth/presentation/useSession";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
// Importar o i18n também o inicializa.
import { applyLanguagePreference } from "@/i18n";
import { envResult } from "@/lib/env";
import { usePrefs } from "@/lib/prefs";
import { queryClient } from "@/lib/queryClient";
import { bindAuthRefreshToAppState } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const language = usePrefs((s) => s.language);

  useEffect(() => {
    applyLanguagePreference(language);
  }, [language]);

  // Sem as fontes o app ainda funciona (cai na fonte do sistema), então um erro não trava a abertura.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <ThemedStatusBar />
            {envResult.ok ? <Gate /> : <ConfigMissing missing={envResult.missing} />}
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

/** Decide o que pode abrir conforme sessão e perfil (veja features/auth/domain/gate.ts). */
function Gate() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const sessionLoaded = useSession((s) => s.loaded);
  const hasSession = useSession((s) => !!s.session);
  const profile = useMyProfile();
  const pendingNext = usePendingRedirect((s) => s.next);

  useEffect(() => {
    const stopSession = startSessionListener();
    const stopRefresh = bindAuthRefreshToAppState();
    return () => {
      stopSession();
      stopRefresh();
    };
  }, []);

  const status = resolveGate({
    sessionLoaded,
    hasSession,
    profileLoaded: profile.isSuccess,
    profileFailed: profile.isError,
  });

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Destino pedido por um link (ex.: redefinir senha), aplicado quando o app estiver liberado.
  useEffect(() => {
    if (pendingNext && status === "ready") {
      usePendingRedirect.setState({ next: null });
      router.push(pendingNext as never);
    }
  }, [pendingNext, status]);

  if (status === "loading") {
    // Só aparece depois do login, enquanto o perfil carrega (na abertura a splash cobre isto).
    return sessionLoaded ? (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppBackground />
        <ActivityIndicator color={colors.brandText} />
      </View>
    ) : null;
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppBackground />
        <EmptyState
          title={t("common.errorGeneric")}
          text={t("auth.errors.network")}
          action={<Button label={t("common.retry")} onPress={() => profile.refetch()} />}
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade" }}>
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "ready"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={hasSession}>
        <Stack.Screen name="reset-password" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

function ConfigMissing({ missing }: { missing: string[] }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <AppBackground />
      <EmptyState
        title={t("config.title")}
        text={`${t("config.text")}\n\n${t("config.missing", { vars: missing.join(", ") })}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
