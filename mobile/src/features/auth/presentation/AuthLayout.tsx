import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Logo, Screen, Text, useTheme } from "@/design-system";

/** Moldura das telas de login/cadastro: voltar, logo, título e conteúdo. */
export function AuthLayout({
  title,
  subtitle,
  children,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={styles.top}>
        {showBack && router.canGoBack() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={() => router.back()}
            hitSlop={8}
            style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <ChevronLeft size={22} color={colors.fg} />
          </Pressable>
        ) : null}
        <Logo size={36} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View role="alert" accessibilityLiveRegion="assertive" style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
      <Text variant="bodyStrong" color="danger" style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10}>
      <Text variant="bodyStrong" color="brandText">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heading: { gap: 4, marginTop: 8, marginBottom: 8 },
  error: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 14 },
});
