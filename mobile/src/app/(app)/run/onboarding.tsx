import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, Logo, Screen, Segmented, Text, TextField, useTheme } from "@/design-system";
import { fieldErrors, type MessageKey } from "@/features/auth/domain/validation";
import { useSession } from "@/features/auth/presentation/useSession";
import { ProfileError } from "@/features/profile/data/profileRepository";
import { onboardingSchema, type Units } from "@/features/profile/domain/profile";
import { suggestUsername } from "@/features/profile/domain/username";
import { useCompleteOnboarding, useMyProfile } from "@/features/profile/presentation/useProfile";
import { UsernameField } from "@/features/profile/presentation/UsernameField";
import { backToTreinoUp } from "@/features/navigation/TopBar";
import { useUsernameCheck } from "@/features/profile/presentation/useUsernameCheck";

/** Primeira entrada no TreinoUp Run: @usuário, nome e unidades. Ao concluir, o layout do Run abre as abas. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useMyProfile().data;
  const email = useSession((s) => s.session?.user.email ?? null);
  const metaName = useSession((s) => {
    const n = s.session?.user.user_metadata?.name ?? s.session?.user.user_metadata?.full_name;
    return typeof n === "string" ? n : null;
  });

  const initialName = profile?.name ?? metaName ?? "";
  const [displayName, setDisplayName] = useState(initialName);
  const [username, setUsername] = useState(() => profile?.username ?? suggestUsername(initialName, email));
  const [units, setUnits] = useState<Units>(profile?.units ?? "metric");
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const check = useUsernameCheck(username, profile?.username);
  const complete = useCompleteOnboarding();

  function submit() {
    setSubmitError(null);
    const parsed = onboardingSchema.safeParse({ username, displayName, units });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    if (check.state === "taken") return;
    complete.mutate(parsed.data, {
      onError: (e) => {
        if (e instanceof ProfileError && e.key === "validation.username.taken") setSubmitError(t(e.key));
        else setSubmitError(t("common.errorGeneric"));
      },
    });
  }

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("header.backToTreinoUp")}
          onPress={backToTreinoUp}
          hitSlop={8}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <ChevronLeft size={22} color={colors.fg} />
        </Pressable>
        <Logo size={36} variant="run" />
      </View>
      <View style={styles.heading}>
        <Text variant="overline" color="brandText">
          {t("onboarding.welcome")}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {t("onboarding.title")}
        </Text>
        <Text variant="body" color="muted">
          {t("onboarding.subtitle")}
        </Text>
      </View>

      <UsernameField
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setSubmitError(null);
        }}
        check={check}
        submitError={submitError ?? (errors.username ? t(errors.username) : null)}
      />
      <TextField
        label={t("fields.displayName")}
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName ? t(errors.displayName) : null}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={60}
      />

      <View style={styles.units}>
        <Text variant="label" color="muted">
          {t("onboarding.unitsTitle")}
        </Text>
        <Segmented
          accessibilityLabel={t("onboarding.unitsTitle")}
          value={units}
          onChange={setUnits}
          options={[
            { value: "metric", label: t("units.metric") },
            { value: "imperial", label: t("units.imperial") },
          ]}
        />
      </View>

      <Card style={styles.note}>
        <ShieldCheck size={22} color={colors.brandText} />
        <Text variant="body" color="muted" style={styles.noteText}>
          {t("onboarding.privacyNote")}
        </Text>
      </Card>

      <Button
        size="lg"
        block
        label={t("onboarding.submit")}
        loading={complete.isPending}
        disabled={check.state === "checking"}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  back: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heading: { gap: 4, marginTop: 8 },
  units: { gap: 6 },
  note: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
