import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { radius } from "../tokens";
import { Text } from "./Text";

/** Chip de filtro/seleção (esporte, período, unidades). */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surface,
          borderColor: selected ? colors.brand : colors.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon}
      <Text variant="label" style={{ color: selected ? colors.onBrand : colors.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
