import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { Button, Text, useTheme } from "@/design-system";
import { envResult } from "@/lib/env";
import { appleNativeAvailable, AuthFailure, signInWithAppleNative, signInWithOAuth } from "../data/authRepository";

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function AppleIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.84-2.1 1.5-3.2 1.41-.14-1.1.4-2.26 1.14-3.03.82-.86 2.2-1.5 3.26-1.38zM20.5 17.3c-.55 1.26-.82 1.82-1.52 2.93-.98 1.55-2.36 3.48-4.07 3.5-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.71-.02-3.02-1.76-4-3.31C-.07 16.04-.36 10.9 1.3 8.36c1.18-1.8 3.04-2.86 4.79-2.86 1.78 0 2.9 1 4.37 1 1.43 0 2.3-1 4.36-1 1.55 0 3.2.85 4.37 2.3-3.84 2.1-3.22 7.58.31 9.5z"
      />
    </Svg>
  );
}

/**
 * Google e Apple. Cada botão só aparece com a variável EXPO_PUBLIC_AUTH_* ligada
 * (o provedor precisa estar configurado no Supabase). No iOS a Apple usa o botão nativo.
 */
export function OAuthButtons({ onError }: { onError: (message: string) => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [appleNative, setAppleNative] = useState(false);

  const env = envResult.ok ? envResult.env : null;
  const google = !!env?.authGoogle;
  const apple = !!env?.authApple;

  useEffect(() => {
    if (apple) appleNativeAvailable().then(setAppleNative);
  }, [apple]);

  if (!google && !apple) return null;

  async function run(provider: "google" | "apple") {
    setBusy(provider);
    try {
      if (provider === "apple" && appleNative) await signInWithAppleNative();
      else await signInWithOAuth(provider);
    } catch (e) {
      onError(t(e instanceof AuthFailure ? e.key : "auth.errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.line }]} />
        <Text variant="overline" color="faint">
          {t("common.or")}
        </Text>
        <View style={[styles.line, { backgroundColor: colors.line }]} />
      </View>
      {google ? (
        <Button
          variant="secondary"
          size="lg"
          block
          label={t("auth.oauth.google")}
          icon={<GoogleIcon />}
          loading={busy === "google"}
          disabled={busy !== null}
          onPress={() => run("google")}
        />
      ) : null}
      {apple && appleNative && Platform.OS === "ios" ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === "dark"
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={27}
          style={styles.appleNative}
          onPress={() => run("apple")}
        />
      ) : apple ? (
        <Button
          variant="secondary"
          size="lg"
          block
          label={t("auth.oauth.apple")}
          icon={<AppleIcon color={colors.fg} />}
          loading={busy === "apple"}
          disabled={busy !== null}
          onPress={() => run("apple")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  appleNative: { height: 54, width: "100%" },
});
