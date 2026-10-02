import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme";
import { radius, space } from "../tokens";
import { Text } from "./Text";

export function Card({ style, ...rest }: ViewProps) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        scheme === "dark" ? styles.borderDark : styles.shadowLight,
        scheme === "dark" && { borderColor: colors.line },
        style,
      ]}
      {...rest}
    />
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="overline" color="muted" accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  badge,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  badge?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      {icon ? <View style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}>{icon}</View> : null}
      {badge ? (
        <View style={[styles.badge, { borderColor: colors.brand }]}>
          <Text variant="caption" color="brandText">
            {badge}
          </Text>
        </View>
      ) : null}
      <Text variant="heading" align="center" accessibilityRole="header">
        {title}
      </Text>
      {text ? (
        <Text variant="body" color="muted" align="center" style={styles.emptyText}>
          {text}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.xl },
  shadowLight: {
    shadowColor: "#14141A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  borderDark: { borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  empty: { alignItems: "center", gap: space.md, paddingHorizontal: space.xxl, paddingVertical: space.xxxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyText: { maxWidth: 320 },
  badge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
});
