import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, TextField, useTheme } from "@/design-system";
import { AuthFailure, sendPasswordReset } from "@/features/auth/data/authRepository";
import { fieldErrors, forgotSchema, type MessageKey } from "@/features/auth/domain/validation";
import { AuthLayout, FormError } from "@/features/auth/presentation/AuthLayout";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    const parsed = forgotSchema.safeParse({ email });
    setFormError(null);
    if (!parsed.success) return setError(fieldErrors(parsed.error).email ?? null);
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSentTo(parsed.data.email);
    } catch (e) {
      setFormError(t(e instanceof AuthFailure ? e.key : "auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title={t("auth.forgot.sentTitle")}>
        <EmptyState
          icon={<MailCheck size={28} color={colors.brandText} />}
          title={sentTo}
          text={t("auth.forgot.sentText", { email: sentTo })}
          action={<Button variant="secondary" label={t("auth.callback.toLogin")} onPress={() => router.replace("/login")} />}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")}>
      <View style={styles.form}>
        <TextField
          label={t("fields.email")}
          value={email}
          onChangeText={setEmail}
          error={error ? t(error) : null}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <FormError message={formError} />
        <Button size="lg" block label={t("auth.forgot.submit")} loading={loading} onPress={submit} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
