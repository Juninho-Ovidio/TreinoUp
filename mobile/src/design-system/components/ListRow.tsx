import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../theme";
import { space, touchTarget } from "../tokens";
import { Text } from "./Text";

/** Linha de lista (configurações, menus). Sem `onPress`, vira só informação. */
export function ListRow({
  label,
  value,
  icon,
  onPress,
  destructive = false,
  chevron = !!onPress,
  accessibilityLabel,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="bodyStrong" color={destructive ? "danger" : "fg"} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" color="muted" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {chevron ? <ChevronRight size={18} color={colors.faint} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.line }]} />;
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 4,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  icon: { width: 24, alignItems: "center" },
  label: { flex: 1 },
  value: { maxWidth: "50%" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
});
