import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Languages, LogOut, Mail, Trash2, UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, Chip, Divider, ListRow, Screen, SectionTitle, Segmented, Text, useTheme, useToast } from "@/design-system";
import { signOut } from "@/features/auth/data/authRepository";
import { useSession, useUserId } from "@/features/auth/presentation/useSession";
import { deleteMyAccount } from "@/features/profile/data/profileRepository";
import type { Units } from "@/features/profile/domain/profile";
import { useMyProfile, useUpdateUnits } from "@/features/profile/presentation/useProfile";
import { StackTopBar } from "@/features/navigation/TopBar";
import { SUPPORTED_LANGUAGES, type LanguagePreference } from "@/i18n/language";
import { usePrefs, type ThemePreference } from "@/lib/prefs";

/** Pergunta de confirmação que funciona no celular e no navegador. */
function confirm(title: string, message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const userId = useUserId();
  const email = useSession((s) => s.session?.user.email ?? "");
  const profile = useMyProfile().data;
  const updateUnits = useUpdateUnits();
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const language = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!userId || deleting) return;
    const ok = await confirm(t("settings.deleteTitle"), t("settings.deleteText"), t("settings.deleteConfirm"), t("common.cancel"));
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMyAccount(userId);
      toast.success(t("settings.deleted"));
    } catch {
      toast.error(t("common.errorGeneric"));
      setDeleting(false);
    }
  }

  function onUnits(units: Units) {
    updateUnits.mutate(units, {
      onSuccess: () => toast.success(t("settings.unitsSaved")),
      onError: () => toast.error(t("common.errorGeneric")),
    });
  }

  const languageOptions: { value: LanguagePreference; label: string }[] = [
    { value: "system", label: t("settings.languageSystem") },
    ...SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) })),
  ];

  return (
    <Screen header={<StackTopBar title={t("settings.title")} />}>
      <SectionTitle>{t("settings.sectionAccount")}</SectionTitle>
      <Card style={styles.list}>
        <ListRow
          icon={<UserRound size={20} color={colors.fg} />}
          label={t("settings.editProfile")}
          onPress={() => router.push("/edit-profile")}
        />
        <Divider />
        <ListRow icon={<Mail size={20} color={colors.muted} />} label={email} accessibilityLabel={t("settings.signedInAs", { email })} />
        <Divider />
        <ListRow icon={<LogOut size={20} color={colors.fg} />} label={t("settings.signOut")} onPress={() => signOut()} />
        <Divider />
        <ListRow
          icon={<Trash2 size={20} color={colors.danger} />}
          label={t("settings.deleteAccount")}
          destructive
          chevron={false}
          onPress={onDelete}
        />
      </Card>

      <SectionTitle>{t("settings.sectionAppearance")}</SectionTitle>
      <Card style={styles.block}>
        <Text variant="label" color="muted">
          {t("settings.theme")}
        </Text>
        <Segmented<ThemePreference>
          accessibilityLabel={t("settings.theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("settings.themeSystem") },
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ]}
        />
      </Card>

      <SectionTitle>{t("settings.sectionPreferences")}</SectionTitle>
      <Card style={styles.block}>
        <View style={styles.labelRow}>
          <Languages size={18} color={colors.muted} />
          <Text variant="label" color="muted">
            {t("settings.language")}
          </Text>
        </View>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t("settings.language")}>
          {languageOptions.map((o) => (
            <Chip key={o.value} label={o.label} selected={language === o.value} onPress={() => setLanguage(o.value)} />
          ))}
        </View>
        <Text variant="label" color="muted" style={styles.spaced}>
          {t("settings.units")}
        </Text>
        <Segmented<Units>
          accessibilityLabel={t("settings.units")}
          value={profile?.units ?? "metric"}
          onChange={onUnits}
          options={[
            { value: "metric", label: t("units.metric") },
            { value: "imperial", label: t("units.imperial") },
          ]}
        />
      </Card>

      <SectionTitle>{t("settings.sectionAbout")}</SectionTitle>
      <Text variant="caption" color="muted">
        {t("app.name")} · {t("settings.version", { version: Constants.expoConfig?.version ?? "0.0.0" })}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 0, paddingVertical: 4, overflow: "hidden" },
  block: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  spaced: { marginTop: 8 },
});
