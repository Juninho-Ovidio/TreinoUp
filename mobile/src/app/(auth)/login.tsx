import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, TextField } from "@/design-system";
import { AuthFailure, signInWithPassword } from "@/features/auth/data/authRepository";
import { fieldErrors, loginSchema, type MessageKey } from "@/features/auth/domain/validation";
import { AuthLayout, FormError, TextLink } from "@/features/auth/presentation/AuthLayout";
import { OAuthButtons } from "@/features/auth/presentation/OAuthButtons";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    setFormError(null);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      // Ao entrar, o layout raiz troca para o app (ou onboarding) sozinho.
      await signInWithPassword(parsed.data);
    } catch (e) {
      setFormError(t(e instanceof AuthFailure ? e.key : "auth.errors.generic"));
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <View style={styles.form}>
        <TextField
          label={t("fields.email")}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? t(errors.email) : null}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label={t("fields.password")}
          value={password}
          onChangeText={setPassword}
          error={errors.password ? t(errors.password) : null}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.forgot}>
          <TextLink label={t("auth.login.forgot")} onPress={() => router.push("/forgot-password")} />
        </View>
        <FormError message={formError} />
        <Button size="lg" block label={t("auth.login.submit")} loading={loading} onPress={submit} />
      </View>
      <OAuthButtons onError={setFormError} />
      <View style={styles.footer}>
        <Text variant="body" color="muted">
          {t("auth.login.noAccount")}
        </Text>
        <TextLink label={t("auth.login.createAccount")} onPress={() => router.replace("/signup")} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  forgot: { alignItems: "flex-end", marginTop: -4 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16 },
});
