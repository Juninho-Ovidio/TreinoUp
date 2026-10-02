import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, fonts, Logo, Ring, Screen, Text } from "@/design-system";

/** Boas-vindas do TreinoUp (mesmo conteúdo do site, citando também o TreinoUp Run). */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={["top", "bottom", "left", "right"]} contentStyle={styles.content}>
      <Logo size={40} />
      <View style={styles.hero}>
        <View style={styles.ring}>
          <Ring value={68} max={100} size={200} stroke={16} accessibilityLabel={t("auth.welcome.ringLabel")}>
            <Text style={styles.ringValue}>68%</Text>
            <Text variant="caption" color="muted">
              {t("auth.welcome.ringCaption")}
            </Text>
          </Ring>
        </View>
        <View style={styles.copy}>
          <Text variant="display" align="center" accessibilityRole="header">
            {t("auth.welcome.title")}
          </Text>
          <Text variant="body" color="muted" align="center" style={styles.text}>
            {t("auth.welcome.text")}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button size="lg" block label={t("auth.welcome.start")} onPress={() => router.push("/signup")} />
        <Button size="lg" block variant="ghost" label={t("auth.welcome.haveAccount")} onPress={() => router.push("/login")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: "space-between" },
  hero: { flex: 1, justifyContent: "center", gap: 32, paddingVertical: 24 },
  ring: { alignItems: "center" },
  ringValue: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  copy: { gap: 12, alignItems: "center" },
  text: { maxWidth: 340 },
  actions: { gap: 8 },
});
