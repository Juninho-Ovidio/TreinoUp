import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, TextField, useToast } from "@/design-system";
import { AuthFailure, updatePassword } from "@/features/auth/data/authRepository";
import { fieldErrors, newPasswordSchema, type MessageKey } from "@/features/auth/domain/validation";
import { AuthLayout, FormError } from "@/features/auth/presentation/AuthLayout";

/** Aberta pelo link "recuperar senha" (a sessão já foi criada pelo callback). */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = newPasswordSchema.safeParse({ password });
    setFormError(null);
    if (!parsed.success) return setError(fieldErrors(parsed.error).password ?? null);
    setError(null);
    setLoading(true);
    try {
      await updatePassword(parsed.data.password);
      toast.success(t("auth.reset.success"));
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setFormError(t(e instanceof AuthFailure ? e.key : "auth.errors.generic"));
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      <View style={styles.form}>
        <TextField
          label={t("fields.newPassword")}
          value={password}
          onChangeText={setPassword}
          error={error ? t(error) : null}
          hint={t("auth.signup.passwordHint")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <FormError message={formError} />
        <Button size="lg" block label={t("auth.reset.submit")} loading={loading} onPress={submit} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
