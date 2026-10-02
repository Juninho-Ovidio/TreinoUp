import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme";
import { radius } from "../tokens";
import { Text } from "./Text";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Controle segmentado (tema, unidades). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, { backgroundColor: colors.surface2, borderColor: colors.line }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.item, selected && { backgroundColor: colors.surface, ...styles.selected }]}
          >
            <Text variant="label" color={selected ? "fg" : "muted"} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4 },
  item: { flex: 1, minHeight: 40, borderRadius: radius.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  selected: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
