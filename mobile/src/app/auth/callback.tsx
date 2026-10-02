import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppBackground, Button, EmptyState, Text, useTheme } from "@/design-system";
import { completeAuthFromUrl } from "@/features/auth/data/authRepository";
import { callbackFromParams } from "@/features/auth/domain/callbackUrl";
import { usePendingRedirect } from "@/features/auth/presentation/pendingRedirect";
import { useSession } from "@/features/auth/presentation/useSession";

/**
 * Retorno dos links de e-mail (confirmação, nova senha) e do login social no navegador.
 * Troca o código por uma sessão; o layout raiz então libera o app.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const hasSession = useSession((s) => !!s.session);
  // Sem código nem tokens na URL não há o que trocar: mostra o erro direto.
  const [failed, setFailed] = useState(() => callbackFromParams(params).kind === "empty");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (callbackFromParams(params).kind === "empty") return;
    const qs = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v[0]! : v]])),
    );
    completeAuthFromUrl(`?${qs.toString()}`)
      .then(({ next }) => {
        if (next) usePendingRedirect.setState({ next });
      })
      .catch(() => setFailed(true));
  }, [params]);

  // No Android o retorno do login social pode chegar duas vezes; se a sessão já existe, segue em frente.
  useEffect(() => {
    if (hasSession) router.replace("/");
  }, [hasSession]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AppBackground />
      {failed && !hasSession ? (
        <EmptyState
          title={t("auth.callback.failed")}
          action={<Button label={t("auth.callback.toLogin")} onPress={() => router.replace("/login")} />}
        />
      ) : (
        <View style={styles.working} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.brandText} />
          <Text variant="bodyStrong" color="muted">
            {t("auth.callback.working")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  working: { alignItems: "center", gap: 12 },
});
