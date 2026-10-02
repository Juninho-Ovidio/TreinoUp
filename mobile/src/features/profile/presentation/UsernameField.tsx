import { useTranslation } from "react-i18next";
import { TextField } from "@/design-system";
import { usernameErrorKey } from "../domain/username";
import type { UsernameCheck } from "./useUsernameCheck";

/** Campo "@usuario" com a validação ao vivo de useUsernameCheck. */
export function UsernameField({
  value,
  onChangeText,
  check,
  submitError,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (v: string) => void;
  check: UsernameCheck;
  /** Erro vindo do envio (ex.: nome tomado entre a checagem e o salvar). */
  submitError?: string | null;
  onSubmitEditing?: () => void;
}) {
  const { t } = useTranslation();
  const error =
    submitError ??
    (check.state === "invalid"
      ? t(usernameErrorKey(check.error))
      : check.state === "taken"
        ? t(usernameErrorKey("taken"))
        : null);

  return (
    <TextField
      label={t("fields.username")}
      prefix="@"
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/\s/g, "").toLowerCase())}
      error={error}
      success={check.state === "available" ? t("onboarding.available") : null}
      hint={check.state === "checking" ? t("onboarding.checking") : t("onboarding.usernameHint")}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="username"
      textContentType="username"
      maxLength={30}
      returnKeyType="next"
      onSubmitEditing={onSubmitEditing}
    />
  );
}
