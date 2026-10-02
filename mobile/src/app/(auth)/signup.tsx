import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { router } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, Text, TextField, useTheme } from "@/design-system";
import { AuthFailure, signUp } from "@/features/auth/data/authRepository";
import { fieldErrors, signupSchema, type MessageKey } from "@/features/auth/domain/validation";
import { AuthLayout, FormError, TextLink } from "@/features/auth/presentation/AuthLayout";
import { OAuthButtons } from "@/features/auth/presentation/OAuthButtons";

export default function SignupScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    const parsed = signupSchema.safeParse({ displayName, email, password });
    setFormError(null);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(parsed.data);
      // Sem confirmação de e-mail a sessão já abre e o layout raiz leva ao onboarding.
      if (needsConfirmation) setSentTo(parsed.data.email);
    } catch (e) {
      setFormError(t(e instanceof AuthFailure ? e.key : "auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title={t("auth.signup.checkEmailTitle")}>
        <EmptyState
          icon={<MailCheck size={28} color={colors.brandText} />}
          title={sentTo}
          text={t("auth.signup.checkEmailText", { email: sentTo })}
          action={<Button variant="secondary" label={t("auth.signup.login")} onPress={() => router.replace("/login")} />}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.signup.title")} subtitle={t("auth.signup.subtitle")}>
      <View style={styles.form}>
        <TextField
          label={t("fields.displayName")}
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName ? t(errors.displayName) : null}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
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
          hint={t("auth.signup.passwordHint")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <FormError message={formError} />
        <Button size="lg" block label={t("auth.signup.submit")} loading={loading} onPress={submit} />
        <Text variant="caption" color="muted" align="center">
          {t("auth.signup.terms")}
        </Text>
      </View>
      <OAuthButtons onError={setFormError} />
      <View style={styles.footer}>
        <Text variant="body" color="muted">
          {t("auth.signup.haveAccount")}
        </Text>
        <TextLink label={t("auth.signup.login")} onPress={() => router.replace("/login")} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16 },
});
